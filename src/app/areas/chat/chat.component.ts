import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../shared/services/api.service';
import { DeepseekPassObject, Message } from '../../shared/models/deepseek_passobject';
import { DeepseekResponseObject } from '../../shared/models/deepseek_responseobject';
import { HttpEventType } from '@angular/common/http';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { DeepseekPerformanceObject } from '../../shared/models/deepseek_performance';
import { OllamaUnload } from '../../shared/models/ollama_unload';
import { OllamaUnloadResponse } from '../../shared/models/ollama_unload_response';
import { Router } from '@angular/router';

@Component({
    selector: 'deep-chat',
    standalone: false,
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {
    // Chat box area - needed for auto scroll
    @ViewChild('prevRespsArea') respsArea!: ElementRef<HTMLTextAreaElement>;
    // To handle loaders
    working: boolean = false;
    // SEPERATE props for mapping to ollama objects - Could use instances of models directly - DONT AS ITs EASIER TO GO THIS ROUTE FOR YOUTUBE VIDEO EXPLANATIONS.
    textareaContent: string = '';
    deepseekLLM: string = 'DeepSeek-R1:8b';
    maxTokens: number = 500;
    temperature: number = 0.1;
    mustStream: boolean = true;
    content: string = '';

    // Objects for chat handling history
    chatObject: DeepseekPassObject = {} as DeepseekPassObject;
    previousChats: DeepseekPassObject[] = [];
    previousChatKey: string = "DeepPrevChats1";
    performance: DeepseekPerformanceObject = {} as DeepseekPerformanceObject;

    constructor(private _api: ApiService, private _localStorage: LocalStorageService, private router: Router) { }

    ngAfterViewInit(): void {

        // Scroll to the bottom when the component initializes - this was just for testing
        this.scrollToBottom();
    }

    ngOnInit(): void {
        // Initialize and allocate default values to the ollama api pass object (chatObject)
        this.chatObject.messages = [];
        this.chatObject.max_tokens = this.maxTokens;
        this.chatObject.model = this.deepseekLLM;
        this.chatObject.temperature = this.temperature;
        this.chatObject.stream = this.mustStream;
        if (!this.chatObject.id) {
            // allocates a unique id to the specific chat object
            this.chatObject.id = this._localStorage.GenerateShortGuid();
        }
        if (this._localStorage.DoesObjectExist(this.previousChatKey)) {
            // loads up previous chats from browser storage if there are any
            this.previousChats = this._localStorage.GetLocalStorageObjectByKey<DeepseekPassObject[]>(this.previousChatKey);
        }
    }

    unloadModel(): void {
        let unload: OllamaUnload = {
            model: this.deepseekLLM,
            keep_alive: 0
        };
        this._api.postAndStream('api/generate', unload).subscribe({
            next: (event: any) => {
                if (event.type === HttpEventType.Response) {
                    const ollamaResponse: OllamaUnloadResponse = JSON.parse(event.body);
                    console.log(ollamaResponse);
                    alert("Unloaded - model: " + ollamaResponse.model + " | success: " + ollamaResponse.done);
                }
            },
            error: (error) => {
                this.working = false;;
                console.error('HTTP error:', error);
            }
        });
    }

    getLocalModelsList(): void {
        this._api.get('api/tags').subscribe({
            next: (event: any) => {
                let modelList = "NONE";
                if (event.models) {
                    modelList = '';
                    event.models.forEach((m: any) => {
                        // Build string listing all ai models installed on your local pc.
                        modelList += "NAME: " + m.name + " | MODEL: " + m.model + " | SIZE: " + m.size + "\n"; // Example: Log the model to the console
                    });
                }
                alert(modelList);
            },
            error: (error) => {
                console.error('HTTP error:', error);
            }
        });
    }

    getLocalRunningModelsList(): void {
        this._api.get('api/ps').subscribe({
            next: (event: any) => {
                let modelList = "NO RUNNING MODELS";
                if (event.models.length > 0) {
                    modelList = '';
                    event.models.forEach((m: any) => {
                        // Build string listing all ai models currently running on your local pc.
                        modelList += "NAME: " + m.name + " | MODEL: " + m.model + " | SIZE: " + m.size + "\n"; // Example: Log the model to the console
                    });
                }
                alert(modelList);
            },
            error: (error) => {
                console.error('HTTP error:', error);
            }
        });
    }

    sendQuestion(): void {
        // Map/update the values for the ollama api pass object (chatObject)  with the changed values bound in the template.
        this.chatObject.max_tokens = this.maxTokens;
        this.chatObject.model = this.deepseekLLM;
        this.chatObject.temperature = this.temperature;
        this.chatObject.stream = this.mustStream;
        let msg: Message = {
            content: this.content,
            role: "user"
        };
        // Push the new msg/question into the chat object, to maintain conversation history
        this.chatObject.messages.push(msg);
        this.working = true;
        // init http post request to the ollama localhost api, and stream the response
        setTimeout(() => {
            this.scrollToBottom();
        }, 250);
        this._api.postAndStream('api/chat', this.chatObject).subscribe({
            next: (event: any) => {
                // if the response type is still streaming data, obtain the new chunk and pass it through to processing
                if (event.type === HttpEventType.DownloadProgress) {
                    const chunk = event.partialText;
                    this.processChunk(chunk, false);
                }
                // if the response type is the final chunk, passing the response body through for final processing.
                else if (event.type === HttpEventType.Response) {
                    this.processChunk(event.body, true);
                    this.working = false;
                    this.textareaContent = '';
                }
            },
            error: (error) => {
                this.working = false;;
                console.error('HTTP error:', error);
            }
        });
    }

    loadPreviousChat(id: string): void {
        const item = this.previousChats.find(item => item.id === id);
        if (item) {
            this.chatObject = item;
            this.maxTokens = this.chatObject.max_tokens;
            this.deepseekLLM = this.chatObject.model;
            this.temperature = this.chatObject.temperature;
            this.mustStream = this.chatObject.stream;
            this.textareaContent = "";
            setTimeout(() => {
                this.scrollToBottom();
            }, 500);
        }
    }

    clearChats(): void {
        this._localStorage.DeleteStorageObjectByKey(this.previousChatKey);
    }

    getSubstring(text: string, length: number): string {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    abortCurrentRequest(): void {
        this._api.abortRequest();
        this.working = false;
        setTimeout(() => {
            this.router.navigate(['/']).then(() => {
                window.location.reload();
            });
        }, 250);
    }

    private processChunk(chunk: string, complete: boolean): void {
        try {
            // Clears the ai response's text area prop, so that the new response data is able to be shown and not duplicated.
            this.textareaContent = '';
            // iterate through response string and break the response text into a string array by newlines
            const jsonObjects: string[] = chunk.split('\n');
            jsonObjects.forEach((jsonStr: string) => {
                if (jsonStr.trim().length > 0) {
                    // Map the json string to an instance of a DeepseelResponseObject
                    const response: DeepseekResponseObject = JSON.parse(jsonStr);
                    // Append the response message to the already existing message, which is bound to the textarea
                    // control in the template
                    this.textareaContent += response.message.content;
                    this.performance.eval_count = response.eval_count;
                    this.performance.eval_duration = response.eval_duration;
                    this.performance.load_duration = response.load_duration;
                    this.performance.prompt_eval_count = response.prompt_eval_count;
                    this.performance.prompt_eval_duration = response.prompt_eval_duration;
                    this.performance.total_duration = response.total_duration;
                }
            });

            /*
            Check if the current chunk is the last chunk and if it is, update the chat conversation by pushing the
            full ai response into
            the ollama pass objects message array.
            */
            if (complete) {
                let msg: Message = {
                    content: this.textareaContent,
                    role: "assistant"
                };
                // Push the ai response into the ollama api's pass object (chatObject) to maintain conversation history
                this.chatObject.messages.push(msg);
                this.updateItemById(this.chatObject.id, this.chatObject);
            }
            // Scroll to the bottom after updating the content
            setTimeout(() => {
                this.scrollToBottom();
            }, 250);
        } catch (error) {
            console.error('Failed to parse JSON:', error);
        }
    }

    private updateItemById(id: string, newValue: DeepseekPassObject): void {
        const item = this.previousChats.find(item => item.id === id);
        if (item) {
            item.messages = newValue.messages; // Update the value of the found item
        } else {
            this.previousChats.push(newValue);
        }
        // Update local storage
        this._localStorage.SetLocalStorageObject(this.previousChatKey, this.previousChats);
    }

    private scrollToBottom(): void {
        if (this.respsArea) {
            this.respsArea.nativeElement.scrollTop = this.respsArea.nativeElement.scrollHeight;
        }
    }
}
