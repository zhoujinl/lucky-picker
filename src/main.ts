import {createApp} from 'vue'
import App from './App.vue'
import './style.css'
import {localDatabase} from './lib/local-database'
async function start(){
 const root=document.querySelector<HTMLElement>('#app')!
 root.replaceChildren();const message=document.createElement('p');message.style.cssText='padding:48px;font:16px/1.8 system-ui;text-align:center';message.textContent='正在读取本机保存的记录…';root.append(message)
 try{await localDatabase.initialize();createApp(App).mount(root)}catch(e){message.textContent=(e as Error).message;const retry=document.createElement('button');retry.textContent='重新连接本地数据库';retry.addEventListener('click',()=>void start());message.append(document.createElement('br'),retry)}
}
void start()
