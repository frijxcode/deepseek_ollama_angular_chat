import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class LocalStorageService {

  constructor() { }

  GetLocalStorageObjectByKey<Type>(key: string): Type {
    let storedObject = localStorage.getItem(key) ?? '';
    let value: Type = JSON.parse(storedObject);
    return value;
  }

  async GetLocalStorageObjectByKeyAsync<Type>(key: string): Promise<Type> {
    try {
      let storedObject = localStorage.getItem(key) ?? '';
      let value: Type = JSON.parse(storedObject);
      return value;
    } catch (err) {
      console.error(err);
      throw new Error('Local browser data not available');
    }
  }
  
  SetLocalStorageObject(key: string, objectToStore: any): void {
    let jsonObject = JSON.stringify(objectToStore);
    localStorage.setItem(key, jsonObject);
  }

  async SetLocalStorageObjectAsync(key: string, objectToStore: any): Promise<boolean> {
    let jsonObject = JSON.stringify(objectToStore);
    try {
        localStorage.setItem(key, jsonObject);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

  DoesObjectExist(key: string): boolean {
    if (localStorage.getItem(key) == null || localStorage.getItem(key) == '') {
      return false;
    }
    return true;
  }

  DeleteStorageObjectByKey(key: string) {
    localStorage.removeItem(key);
  }

  GenerateShortGuid(): string {
    return 'xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r: number = Math.random() * 16 | 0;
      const v: number = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

}
