import {it,expect} from 'vitest'
import {mkdtemp,mkdir,writeFile,cp,readFile,rm,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {execFileSync,spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createReleaseArchive} from './package-release.mjs'
it('packages a standalone service including stock-pool data, without browser data or node_modules',async()=>{
 const temp=await mkdtemp(join(tmpdir(),'lucky-release-')),root=join(temp,'project with spaces'),out=join(temp,'packages'),unpacked=join(temp,'unpacked');let child
 try{
  await mkdir(join(root,'dist'),{recursive:true});await writeFile(join(root,'dist/index.html'),'<html>deployment smoke test</html>');await cp(new URL('./',import.meta.url),join(root,'scripts'),{recursive:true});await mkdir(join(root,'src/data'),{recursive:true});await cp(new URL('../src/data/stock-pool.json',import.meta.url),join(root,'src/data/stock-pool.json'));await mkdir(join(root,'docs'),{recursive:true});await cp(new URL('../docs/DEPLOYMENT.md',import.meta.url),join(root,'docs/DEPLOYMENT.md'));await cp(new URL('../deploy',import.meta.url),join(root,'deploy'),{recursive:true});await writeFile(join(root,'package.json'),JSON.stringify({name:'lucky-picker',version:'1.0.0'}));await writeFile(join(root,'private.sqlite'),'DO NOT DISTRIBUTE');await mkdir(join(root,'node_modules'));await writeFile(join(root,'node_modules/private.txt'),'DO NOT DISTRIBUTE')
  const result=await createReleaseArchive({root,outDir:out});const bytes=await readFile(result.archive);expect(await readFile(result.checksum,'utf8')).toContain(createHash('sha256').update(bytes).digest('hex'))
  await mkdir(unpacked);execFileSync('tar',['-xzf',result.archive,'-C',unpacked]);const release=join(unpacked,result.name)
  expect(await readFile(join(release,'src/data/stock-pool.json'),'utf8')).toContain('stocks');expect(await readdir(release)).not.toContain('node_modules');expect(await readdir(release)).not.toContain('private.sqlite');expect(await readdir(join(release,'scripts'))).not.toContain('package-release.test.mjs')
  child=spawn(process.execPath,['--experimental-sqlite',join(release,'start.mjs')],{cwd:temp,env:{...process.env,HOST:'127.0.0.1',PORT:'0',LUCKY_PICKER_DATA_DIR:join(temp,'user-data')}})
  const port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('release startup timed out')),10000);child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('release exited '+code))});child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/port: (\d+)/);if(match){clearTimeout(timer);resolve(match[1])}})})
  expect(await(await fetch(`http://127.0.0.1:${port}/`)).text()).toContain('deployment smoke test');const local=await(await fetch(`http://127.0.0.1:${port}/api/local-data`)).json();expect(local.version).toBe(1);expect(local.path).toBe(join(temp,'user-data/data.sqlite'))
 }finally{if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve))}await rm(temp,{recursive:true,force:true})}
},20000)
