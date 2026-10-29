import { preview } from 'vite';
// Keep preview in this process: Windows shell process trees can stall teardown.
export default async function setup(){
  const server=await preview({preview:{host:'127.0.0.1',port:4173,strictPort:true}});
  return async()=>{
    server.httpServer.closeAllConnections();
    await new Promise<void>(resolve=>server.httpServer.close(()=>resolve()));
  };
}
