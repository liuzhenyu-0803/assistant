interface Window {
  require: (module: string) => any;
}

declare module 'electron' {
  export interface IpcRenderer {
    invoke(channel: string, ...args: any[]): Promise<any>;
  }
}
