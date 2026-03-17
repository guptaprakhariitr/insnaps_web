(function(){
  if(!window.InSnapsRSS)return;
  var container=document.getElementById('liveBlogArticles');
  var loading=document.getElementById('blogLoading');
  if(!container)return;

  var labels=(container.getAttribute('data-rss-labels')||'').split(',');
  var feeds=window.InSnapsRSS.FEEDS.filter(function(f){return labels.indexOf(f.label)!==-1});
  if(!feeds.length)feeds=window.InSnapsRSS.shuffle(window.InSnapsRSS.FEEDS.slice()).slice(0,6);

  window.InSnapsRSS.fetchMultiple(feeds).then(function(articles){
    if(!articles.length){if(loading)loading.querySelector('p').textContent='Unable to load articles right now.';return}
    var seen={};
    var unique=articles.filter(function(a){var k=a.title.toLowerCase().substring(0,50);if(seen[k])return false;seen[k]=true;return true});
    var top=unique.slice(0,24);
    var out='';
    top.forEach(function(a){
      var d=a.pubDate?new Date(a.pubDate):null;
      var ds=d?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
      var src=a.source||'';
      var meta=ds+(src?' &middot; '+src:'');
      out+='<article class="blog-article-item"><h3><a href="'+a.link+'" target="_blank" rel="noopener">'+a.title+'</a></h3>';
      if(meta)out+='<p class="blog-article-meta">'+meta+'</p>';
      out+='<p style="display:inline-block;background:var(--accent-alpha,rgba(59,130,246,0.1));color:var(--accent);font-size:0.72rem;font-weight:600;padding:0.15rem 0.6rem;border-radius:20px;text-transform:uppercase;letter-spacing:0.04em">'+a.feedLabel+'</p></article>';
    });
    container.innerHTML=out;
    var ut=document.getElementById('blogUpdateTime');
    if(ut)ut.textContent='just now';
  }).catch(function(){
    if(loading)loading.querySelector('p').textContent='Unable to load articles right now.';
  });
})();
