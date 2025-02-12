export interface DeepseekPassObject {
    model: string
    max_tokens: number
    temperature: number
    messages: Message[]
    stream: boolean,
    id:string
  }
  
  export interface Message {
    role: string
    content: string
  }
  