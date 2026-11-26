// Adds a "Copy" button to every prompt box on members pages.
document.querySelectorAll('.prompt').forEach(function(p){
  var w=document.createElement('div');w.className='prompt-wrap';p.parentNode.insertBefore(w,p);w.appendChild(p);
  var b=document.createElement('button');b.type='button';b.className='copy';b.textContent='Copy';
  b.addEventListener('click',function(){
    var t=p.innerText;
    (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='Copied';},function(){
      var r=document.createRange();r.selectNodeContents(p);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Press Ctrl+C';});
    setTimeout(function(){b.textContent='Copy';},2000);
  });
  w.appendChild(b);
});
