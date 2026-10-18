import { createConnection, type Socket } from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ManagerMessage } from '@agent-console/protocol';
export type { LifecycleMessage, ManagerMessage, StateMessage, ViewState } from '@agent-console/protocol';
export const communicationSocket = process.env.PI_MANAGER_SOCKET ?? join(homedir(), '.pi', 'agent', 'runtime', 'pi-agent-lifecycle', 'communication.sock');
export type StateConnection = { socket: Socket; subscribe(topics?: string[]): void; getState(): void; search(query: string, requestId?: string): void; setFocus(id: string|null): void; clearFocus(): void; setActive(id: string|null): void; clearActive(): void; setSubmission(id: string,eventId: string): void; close(): void };
export function connectToManager(onState: (message: ManagerMessage)=>void, onError: (error: Error)=>void=()=>undefined): Promise<StateConnection> {
 return new Promise((resolve,reject)=>{ let current: Socket|undefined; let api: StateConnection; let topics=['state']; let sr=0, lr=0, closed=false; let timer: NodeJS.Timeout|undefined;
  const send=(m: Record<string,unknown>)=>{if(current&&!current.destroyed) current.write(JSON.stringify(m)+'\n')};
  const connect=()=>{if(closed)return; const socket=createConnection(communicationSocket); current=socket; let buffer=''; socket.setEncoding('utf8');
   socket.on('connect',()=>{send({type:'subscribe',topics: topics.includes('lifecycle')&&!topics.includes('lifecycle-revisions') ? [...topics,'lifecycle-revisions'] : topics}); if(!api){api=makeApi(); resolve(api);}});
   socket.on('data',(chunk)=>{buffer+=chunk; const lines=buffer.split('\n'); buffer=lines.pop()??''; for(const line of lines.map(x=>x.trim()).filter(Boolean)) try {const m=JSON.parse(line) as ManagerMessage; if(m.type==='state-snapshot'||m.type==='state-changed'){if(m.revision<=sr)continue; if(sr&&m.revision>sr+1)send({type:'get-state'}); sr=m.revision;} else if(m.type==='agent.created'||m.type==='instance.updated'||m.type==='instance.closed'){if(m.revision!==undefined){if(m.revision<=lr)continue;if(lr&&m.revision>lr+1)send({type:'search',query:''});lr=m.revision;}} onState(m);} catch {onError(new Error('Invalid manager response'));}});
   socket.on('error',(e)=>{if(!api)reject(e);else onError(e)}); socket.on('close',()=>{if(!closed)timer=setTimeout(connect,250)}); };
  const makeApi=():StateConnection=>({get socket(){return current as Socket},subscribe:(t=['state'])=>{topics=t;const wireTopics=t.includes('lifecycle')&&!t.includes('lifecycle-revisions')?[...t,'lifecycle-revisions']:t;send({type:'subscribe',topics:wireTopics})},getState:()=>send({type:'get-state'}),search:(query,requestId)=>send({type:'search',query,requestId}),setFocus:id=>send({type:'set-focus',id}),clearFocus:()=>send({type:'clear-focus'}),setActive:id=>send({type:'set-active',id}),clearActive:()=>send({type:'clear-active'}),setSubmission:(id,eventId)=>send({type:'set-submission',id,eventId}),close:()=>{closed=true;if(timer)clearTimeout(timer);current?.destroy()}});
  connect();
 });
}
