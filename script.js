const PLAYLISTS = [
      "PLFW6JAGlrEs0dhev6Dn7KX2O9wQnWRNjj",
      "PLEWEj5NdvUqJeYfSDC4jJQXGgw92vNb6k"
    ];

    // Mahalaya 2026: 10 October. The countdown is to the start of that local day.
    const target = new Date("2026-10-10T00:00:00+05:30").getTime();
    const $ = id => document.getElementById(id);

    function tick(){
      const diff = Math.max(0, target - Date.now());
      const s = Math.floor(diff/1000);
      $("days").textContent = String(Math.floor(s/86400)).padStart(2,"0");
      $("hours").textContent = String(Math.floor(s%86400/3600)).padStart(2,"0");
      $("mins").textContent = String(Math.floor(s%3600/60)).padStart(2,"0");
      $("secs").textContent = String(s%60).padStart(2,"0");
    }
    tick(); setInterval(tick,1000);

    let player, playlistNumber=0, manuallySeeking=false;

    window.onYouTubeIframeAPIReady = function(){
      player = new YT.Player("yt",{
        width:"1",height:"1",
        playerVars:{
          autoplay:0,controls:0,disablekb:1,playsinline:1,
          rel:0,modestbranding:1,
          listType:"playlist",list:PLAYLISTS[0]
        },
        events:{
          onReady: e => {
            e.target.setVolume(75);
            updateTitle();
            setInterval(updatePlayerUI,500);
          },
          onStateChange: e => {
            if(e.data === YT.PlayerState.PLAYING){
              $("play").textContent="❚❚"; updateTitle();
            } else if(e.data === YT.PlayerState.PAUSED){
              $("play").textContent="▶";
            } else if(e.data === YT.PlayerState.ENDED){
              $("play").textContent="▶";
              // When playlist 1 finishes, continue automatically with playlist 2.
              const list = player.getPlaylist ? player.getPlaylist() : [];
              const idx = player.getPlaylistIndex ? player.getPlaylistIndex() : -1;
              if(playlistNumber === 0 && list.length && idx >= list.length-1){
                playlistNumber=1;
                player.loadPlaylist({list:PLAYLISTS[1],listType:"playlist",index:0});
              }
            }
          }
        }
      });
    };

    function updateTitle(){
      try{
        const d=player.getVideoData();
        if(d && d.title) $("title").textContent=d.title;
      }catch(e){}
    }
    function fmt(sec){
      if(!isFinite(sec)) return "0:00";
      sec=Math.max(0,Math.floor(sec));
      return Math.floor(sec/60)+":"+String(sec%60).padStart(2,"0");
    }
    function updatePlayerUI(){
      if(!player || !player.getDuration) return;
      const duration=player.getDuration()||0, current=player.getCurrentTime()||0;
      if(!manuallySeeking && duration){
        $("progress").value=(current/duration)*100;
      }
      $("time").textContent=fmt(current)+" / "+fmt(duration);
      if(player.getPlayerState && player.getPlayerState()===YT.PlayerState.PLAYING) updateTitle();
    }

    $("play").onclick=()=>{
      if(!player) return;
      const s=player.getPlayerState();
      if(s===YT.PlayerState.PLAYING) player.pauseVideo();
      else player.playVideo();
    };
    $("prev").onclick=()=>{ if(player) player.previousVideo(); };
    $("next").onclick=()=>{ if(player) player.nextVideo(); };
    $("mute").onclick=()=>{
      if(!player) return;
      if(player.isMuted()){ player.unMute(); $("mute").textContent="🔊"; }
      else { player.mute(); $("mute").textContent="🔇"; }
    };
    $("progress").addEventListener("input",()=>{
      manuallySeeking=true;
      if(player && player.getDuration) {
        const t=(Number($("progress").value)/100)*player.getDuration();
        $("time").textContent=fmt(t)+" / "+fmt(player.getDuration());
      }
    });
    $("progress").addEventListener("change",()=>{
      if(player && player.getDuration) player.seekTo((Number($("progress").value)/100)*player.getDuration(),true);
      manuallySeeking=false;
    });
