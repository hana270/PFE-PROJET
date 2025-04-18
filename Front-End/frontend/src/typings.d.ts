import '@angular/localize/init';

declare module '*.json' {
    const value: any;
    export default value;
  }