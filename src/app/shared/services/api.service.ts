import { Injectable } from '@angular/core';
import { catchError, Observable, throwError, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders, HttpParams, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private abortSubject: Subject<void> = new Subject<void>();

  constructor(
    private http: HttpClient,
  ) { }

  // A Function to send a POST request and stream the data from the HTTP response
  postAndStream(url: string, data: any): Observable<HttpEvent<any>> {
    // Emit a value to abort any ongoing request - before we make another request
    this.abortSubject.next();
    // Sets the headers for the HTTP request, specifying that the content type is JSON
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // Sends a POST request to the specified URL with the provided data
    return this.http.post(`${environment.api_url}${url}`, data, {
      headers,
      responseType: 'text',
      observe: 'events',
      reportProgress: true
    })
      .pipe(
        takeUntil(this.abortSubject),  // Complete the stream when abort signal is emitted
        catchError(this.handleError)
      );
  }

  get(url: string, params?: { [key: string]: string | number }): Observable<any> {
      // Sets the headers for the HTTP request, specifying that the content type is JSON
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    // Create HttpParams from the provided params object
    let httpParams = new HttpParams();
    if (params) {
      // Builds the get params from the params object passed to the method
      Object.keys(params).forEach(key => {
        httpParams = httpParams.append(key, params[key].toString());
      });
    }
    // Perform the GET request
    return this.http.get(`${environment.api_url}${url}`, {
      headers,
      params: httpParams // Use HttpParams for query parameters
    }).pipe(
      catchError(this.handleError) // Handle errors
    );
  }

  // Function to abort the current request
  abortRequest(): void {
    // Will emit a value resulting in any current http post request be aborted early
    this.abortSubject.next();
  }

  // Private method to handle errors that occur during the HTTP request
  private handleError(error: any): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      console.error('An HTTP error occurred:', error);
    } else if (error.name === 'AbortError') {
      console.warn('Request was aborted');
    } else {
      console.error('Oh no it hit the fan:', error);
    }
    return throwError(()=> new Error('Mega fail - try again...'));
  }
}
