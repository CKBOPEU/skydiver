const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release');
const staging=path.join(release,'build-'+Date.now());
const files=['index.html','style.css','js/vendor/phaser.min.js','vendor/PHASER-LICENSE.md','js/GameState.js','js/SaveManager.js','js/YandexManager.js','js/AudioManager.js','js/Skins.js','js/Economy.js','js/Tasks.js','js/Achievements.js','js/FlightCore.js','js/FlightArt.js','js/FlightUI.js','js/Game.js','assets/audio/music/menu.ogg','assets/audio/music/clouds.ogg','assets/audio/music/storm.ogg','assets/audio/music/canyon.mp3','assets/audio/sfx/wind-loop.ogg','assets/audio/sfx/coin.wav','assets/audio/sfx/powerup.ogg','assets/audio/sfx/boost.wav','assets/audio/sfx/click.wav','assets/audio/sfx/near.wav','assets/audio/sfx/impact.wav','assets/audio/sfx/death.wav','assets/audio/sfx/reward.wav','assets/audio/LICENSES.md'];
for(const file of files){if(!/^[\x20-\x7e]+$/.test(file)||/\s/.test(file))throw new Error('Release path must use ASCII without spaces: '+file);}
const unpackedBytes=files.reduce((sum,file)=>sum+fs.statSync(path.join(root,file)).size,0);
if(unpackedBytes>100*1024*1024)throw new Error('Unpacked release exceeds 100 MB');
for(const file of files){const dest=path.join(staging,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
const quote=value=>"'"+value.replace(/'/g,"''")+"'";
const archive=path.join(release,'SkyDiver-v2.zip');
const temporaryArchive=staging+'.zip';
const entries=files.map(file=>`[IO.Compression.ZipFileExtensions]::CreateEntryFromFile($gameZip,${quote(path.join(staging,file))},${quote(file)}) | Out-Null`).join('; ');
execFileSync('powershell.exe',['-NoProfile','-Command',`Add-Type -AssemblyName System.IO.Compression.FileSystem; $gameZip=[IO.Compression.ZipFile]::Open(${quote(temporaryArchive)},'Create'); try { ${entries} } finally { $gameZip.Dispose() }`],{stdio:'inherit',windowsHide:true});
fs.copyFileSync(temporaryArchive,archive);
try{fs.rmSync(staging,{recursive:true,force:true});fs.rmSync(temporaryArchive,{force:true});}catch(error){console.warn('Temporary build files were not removed:',error.message);}
console.log(archive+' ('+fs.statSync(archive).size+' bytes compressed, '+unpackedBytes+' bytes unpacked)');
