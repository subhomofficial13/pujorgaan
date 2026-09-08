/* PujoAschhe — countdown + two-tab custom YouTube player */
const MAHALAYA = new Date("2026-10-10T00:00:00+05:30").getTime();
const $ = (id) => document.getElementById(id);

function updateCountdown(){
  const diff=Math.max(0,MAHALAYA-Date.now());
  const total=Math.floor(diff/1000);
  $("days").textContent=String(Math.floor(total/86400)).padStart(2,"0");
  $("hours").textContent=String(Math.floor((total%86400)/3600)).padStart(2,"0");
  $("mins").textContent=String(Math.floor((total%3600)/60)).padStart(2,"0");
  $("secs").textContent=String(total%60).padStart(2,"0");
}
updateCountdown(); setInterval(updateCountdown,1000);

let player=null, ready=false, groupKey="pujorGaan", index=0, muted=false, timer=null, switching=false;
const videoTitles = new Map();
const videoAuthors = new Map();
const group=()=>TRACK_GROUPS[groupKey];
const ids=()=>group().tracks;
const currentId=()=>ids()[index];
const title=$('title'), meta=$('meta'), collection=$('collection'), art=$('art');

function pad(n){return String(n).padStart(2,'0')}
function fmt(s){s=Math.max(0,Math.floor(Number(s)||0));return `${Math.floor(s/60)}:${pad(s%60)}`}
function updateMeta(){
  collection.textContent=group().label.toUpperCase();
  meta.textContent=`YouTube audio · ${pad(index+1)} / ${ids().length}`;
}
function resetProgress(){ $('progress').value=0; $('currentTime').textContent='0:00'; $('duration').textContent='0:00'; }
function updateTrackUI(){
  updateMeta(); resetProgress();
  const id=currentId();
  title.textContent=videoTitles.get(id) || `${group().label} · Track ${pad(index+1)}`;
  art.innerHTML='<span>♫</span>';
  if(ready && player){
    const d=player.getVideoData?.();
    if(d?.video_id===id && d.title){
      videoTitles.set(id,d.title);
      if(d.author) videoAuthors.set(id,d.author);
      title.textContent=d.title;
    }
  }
}

async function fetchVideoTitle(videoId){
  if(videoTitles.has(videoId)) return;
  try{
    const res=await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`);
    if(!res.ok) return;
    const data=await res.json();
    if(data.title) videoTitles.set(videoId,data.title);
    if(data.author_name) videoAuthors.set(videoId,data.author_name);
    if(videoId===currentId()) updateTrackUI();
  }catch(err){
    // If oEmbed is blocked, the IFrame API will still supply the title when the track is cued.
  }
}

function preloadTitles(){
  const allIds=[...new Set(Object.values(TRACK_GROUPS).flatMap(g=>g.tracks))];
  allIds.forEach(fetchVideoTitle);
}
function setPlayUI(playing){$('play').textContent=playing?'❚❚':'▶';$('play').setAttribute('aria-label',playing?'Pause':'Play')}
function load(indexToLoad, autoplay=false){
  if(!ready||!ids().length)return;
  index=(indexToLoad+ids().length)%ids().length;
  switching=true; updateTrackUI();
  if(autoplay) player.loadVideoById({videoId:currentId()}); else player.cueVideoById({videoId:currentId()});
}
function next(){load(index+1,true)}
function prev(){load(index-1,true)}
function togglePlay(){
  if(!ready||!currentId())return;
  const state=player.getPlayerState();
  if(state===YT.PlayerState.PLAYING){player.pauseVideo();return}
  const vid=player.getVideoData?.().video_id;
  if(vid!==currentId()) load(index,true); else player.playVideo();
}
function switchGroup(key){
  if(key===groupKey)return;
  groupKey=key; index=0;
  document.querySelectorAll('.tab').forEach(t=>{const active=t.dataset.group===key;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active))});
  load(0,false);
  updateTrackUI();
}
function seek(){
  if(!ready||!currentId())return;
  const duration=player.getDuration?.()||0;if(!duration)return;
  player.seekTo((Number($('progress').value)/100)*duration,true);
}
function updateProgress(){
  if(!ready||!currentId())return;
  const now=player.getCurrentTime?.()||0, dur=player.getDuration?.()||0;
  if(dur>0){$('progress').value=(now/dur)*100;$('currentTime').textContent=fmt(now);$('duration').textContent=fmt(dur)}
}
function setVolume(v){if(!ready)return;const n=Number(v);player.setVolume(n);if(n>0){muted=false;player.unMute();$('mute').textContent='🔊'}else{muted=true;player.mute();$('mute').textContent='🔇'}}
function toggleMute(){if(!ready)return;if(muted||player.isMuted?.()){player.unMute();player.setVolume(Number($('volume').value)||75);muted=false;$('mute').textContent='🔊'}else{player.mute();muted=true;$('mute').textContent='🔇'}}

window.onYouTubeIframeAPIReady=function(){
  player=new YT.Player('yt',{host:'https://www.youtube-nocookie.com',width:'1',height:'1',playerVars:{controls:0,disablekb:1,playsinline:1,rel:0,modestbranding:1},events:{
    onReady(e){ready=true;e.target.setVolume(75);updateTrackUI();load(0,false);timer=setInterval(updateProgress,350)},
    onStateChange(e){
      if(e.data===YT.PlayerState.PLAYING){setPlayUI(true);switching=false}
      if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED){setPlayUI(false);updateTrackUI()}
      if(e.data===YT.PlayerState.ENDED&&!switching){setPlayUI(false);next()}
      updateProgress();
    }
  }});
};

$('play').addEventListener('click',togglePlay);$('prev').addEventListener('click',prev);$('next').addEventListener('click',next);$('mute').addEventListener('click',toggleMute);$('progress').addEventListener('input',seek);$('volume').addEventListener('input',e=>setVolume(e.target.value));
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>switchGroup(t.dataset.group)));
updateTrackUI();
preloadTitles();
window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer)});
