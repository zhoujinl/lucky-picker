import {access,cp,mkdir,mkdtemp,readFile,writeFile,rm,copyFile,chmod} from 'node:fs/promises'
import {constants} from 'node:fs'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {join,resolve,relative,dirname,sep,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {execFileSync,spawnSync} from 'node:child_process'
import {parseArgs} from 'node:util'
const projectRoot=fileURLToPath(new URL('../',import.meta.url))
async function runtimeFiles(root){
 const seen=new Set(),directory=join(root,'scripts')
 async function visit(file){if(seen.has(file))return;const rel=relative(directory,file);if(rel.startsWith('..'+sep)||rel==='..'||!file.endsWith('.mjs'))throw Error('服务端模块必须位于 scripts 目录：'+file);seen.add(file)
  const source=await readFile(file,'utf8')
  for(const match of source.matchAll(/^\s*import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm)){const spec=match[1];if(spec.startsWith('node:'))continue;if(!spec.startsWith('.'))throw Error('部署运行时出现外部依赖，请更新打包流程：'+spec);await visit(resolve(dirname(file),spec))}
 }
 await visit(join(directory,'server.mjs'));return [...seen]
}
export async function createReleaseArchive({root=projectRoot,outDir=join(root,'releases'),now=new Date()}={}){
 root=resolve(root);outDir=resolve(outDir);await access(join(root,'dist/index.html'))
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'))
 if(!/^[\w.-]+$/.test(pkg.version))throw Error('无效的项目版本号')
 const stamp=now.toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).replace(/[-: ]/g,'')+'-'+String(now.getMilliseconds()).padStart(3,'0')
 const name=`lucky-picker-${pkg.version}-${stamp}`
 await mkdir(outDir,{recursive:true});const stage=await mkdtemp(join(outDir,'.pack-')),folder=join(stage,name),archive=join(outDir,name+'.tar.gz'),checksum=archive+'.sha256'
 try{
  await mkdir(join(folder,'scripts'),{recursive:true});await cp(join(root,'dist'),join(folder,'dist'),{recursive:true})
  for(const file of await runtimeFiles(root))await copyFile(file,join(folder,'scripts',basename(file)))
  await mkdir(join(folder,'src/data'),{recursive:true});await copyFile(join(root,'src/data/stock-pool.json'),join(folder,'src/data/stock-pool.json'))
  await copyFile(join(root,'docs/DEPLOYMENT.md'),join(folder,'DEPLOYMENT.md'))
  for(const file of ['start.mjs','start.sh','start.cmd','lucky-picker.service'])await copyFile(join(root,'deploy',file),join(folder,file))
  await chmod(join(folder,'start.sh'),0o755)
  await writeFile(join(folder,'package.json'),JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',engines:{node:'>=22.12.0'},scripts:{start:'node --experimental-sqlite start.mjs'}},null,2)+'\n')
  await writeFile(join(folder,'release.json'),JSON.stringify({name:pkg.name,version:pkg.version,builtAt:now.toISOString(),nodeMinimum:'22.12.0',containsUserData:false},null,2)+'\n')
  const temporary=join(stage,name+'.tar.gz');execFileSync('tar',['-czf',temporary,'-C',stage,name],{stdio:'pipe',env:{...process.env,COPYFILE_DISABLE:'1'}})
  const digest=createHash('sha256').update(await readFile(temporary)).digest('hex')
  await copyFile(temporary,archive,constants.COPYFILE_EXCL)
  await writeFile(checksum,`${digest}  ${basename(archive)}\n`,{flag:'wx'})
  return {name,archive,checksum}
 }finally{await rm(stage,{recursive:true,force:true})}
}
function npm(args){const cli=process.env.npm_execpath;const result=cli?spawnSync(process.execPath,[cli,...args],{cwd:projectRoot,stdio:'inherit'}):spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{cwd:projectRoot,stdio:'inherit',shell:process.platform==='win32'});if(result.error)throw result.error;if(result.status!==0)throw Error(`npm ${args.join(' ')} 失败，未生成新部署包`)}
async function main(){
 const {values}=parseArgs({options:{out:{type:'string'},help:{type:'boolean'}}})
 if(values.help){console.log('用法：npm run package -- [--out 输出目录]\n自动安装缺少的构建依赖、运行测试、构建、生成 tar.gz 和 SHA256 校验文件。');return}
 try{execFileSync('tar',['--version'],{stdio:'ignore'})}catch{throw Error('需要 tar 命令（macOS/Linux 通常自带，Windows 可使用系统 tar 或 Git Bash）')}
 try{await access(join(projectRoot,'node_modules/vite/bin/vite.js'))}catch{npm(['ci'])}
 npm(['test']);npm(['run','build'])
 const result=await createReleaseArchive({outDir:values.out?resolve(values.out):undefined})
 console.log(`\n部署包：${result.archive}\n校验文件：${result.checksum}\n解压后运行 start.sh、start.cmd 或 npm start。包内不含 SQLite 及个人记录。`)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error('打包失败：'+error.message);process.exitCode=1})
