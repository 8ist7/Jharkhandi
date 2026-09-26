import fs from 'fs'
import path from 'path'

const STOP = new Set('a an and are as at based be by for from in into is it of on or system that the to using with real time smart ai ml digital development platform powered enabled application solution india indian management monitoring data'.split(/\s+/))
const MULTILINGUAL_ALIASES={

  // Shared Jharkhand regional-language forms and common transliterations.
  // These are semantic hints, not claims of full machine translation.
  'पानि':'water drinking','पानी':'water drinking pipeline','जल':'water','स्कुल':'school education','इसकुल':'school education','पढ़ाई':'education learning',
  'अस्पताल':'hospital healthcare','हस्पताल':'hospital healthcare','दवाइ':'medicine healthcare','खेती':'agriculture crop','किसानी':'farmer agriculture',
  'कचरा':'waste sanitation','नाला':'drain sanitation','बिजली':'electricity energy','सोलर':'solar energy','सड़क':'road urban','रोजगार':'employment livelihood',
  'pani':'water drinking','jal':'water','school':'school education','aspatal':'hospital healthcare','kheti':'agriculture crop','kachra':'waste sanitation','bijli':'electricity energy','sadak':'road urban','rojgar':'employment livelihood',
  // Hindi
  'पानी':'water drinking pipeline','जल':'water','पेयजल':'drinking water','कुआं':'well water','सिंचाई':'irrigation agriculture',
  'शिक्षा':'education school learning','विद्यालय':'school education','स्कूल':'school education','छात्र':'student education','शिक्षक':'teacher education',
  'स्वास्थ्य':'health healthcare','अस्पताल':'hospital healthcare','डॉक्टर':'doctor healthcare','दवा':'medicine healthcare',
  'कृषि':'agriculture farm','खेती':'agriculture crop','किसान':'farmer agriculture','फसल':'crop agriculture',
  'कचरा':'waste sanitation','स्वच्छता':'sanitation cleanliness','नाली':'drain sanitation','सीवेज':'sewage sanitation',
  'पर्यावरण':'environment','प्रदूषण':'pollution environment','जंगल':'forest environment',
  'बिजली':'electricity energy','ऊर्जा':'energy','सौर':'solar energy',
  'सड़क':'road urban','यातायात':'traffic urban','शहर':'urban city','पुल':'bridge urban',
  'दिव्यांग':'accessibility disability','विकलांग':'accessibility disability','व्हीलचेयर':'wheelchair accessibility',
  'प्रमाणपत्र':'certificate public administration','राशन':'ration public administration','योजना':'scheme public administration',
  'रोजगार':'employment livelihood','आजीविका':'livelihood rural','स्वरोजगार':'enterprise livelihood',
  // Bengali
  'পানি':'water drinking','জল':'water','পানীয় জল':'drinking water','সেচ':'irrigation agriculture',
  'শিক্ষা':'education school','বিদ্যালয়':'school education','স্কুল':'school education','ছাত্র':'student education','শিক্ষক':'teacher education',
  'স্বাস্থ্য':'health healthcare','হাসপাতাল':'hospital healthcare','ডাক্তার':'doctor healthcare','ওষুধ':'medicine healthcare',
  'কৃষি':'agriculture','চাষ':'agriculture crop','কৃষক':'farmer agriculture','ফসল':'crop agriculture',
  'আবর্জনা':'waste sanitation','পরিচ্ছন্নতা':'sanitation','নর্দমা':'drain sanitation','পয়ঃনিষ্কাশন':'sewage sanitation',
  'পরিবেশ':'environment','দূষণ':'pollution environment','বন':'forest environment',
  'বিদ্যুৎ':'electricity energy','শক্তি':'energy','সৌর':'solar energy',
  'রাস্তা':'road urban','যানজট':'traffic urban','শহর':'urban city','সেতু':'bridge urban',
  'প্রতিবন্ধী':'accessibility disability','হুইলচেয়ার':'wheelchair accessibility',
  'শংসাপত্র':'certificate public administration','রেশন':'ration public administration','প্রকল্প':'scheme public administration',
  'কর্মসংস্থান':'employment livelihood','জীবিকা':'livelihood rural',
  // Urdu
  'پانی':'water drinking','پینے کا پانی':'drinking water','آبپاشی':'irrigation agriculture',
  'تعلیم':'education school','اسکول':'school education','طالب علم':'student education','استاد':'teacher education',
  'صحت':'health healthcare','ہسپتال':'hospital healthcare','ڈاکٹر':'doctor healthcare','دوا':'medicine healthcare',
  'زراعت':'agriculture','کسان':'farmer agriculture','فصل':'crop agriculture',
  'کچرا':'waste sanitation','صفائی':'sanitation cleanliness','نالہ':'drain sanitation','سیوریج':'sewage sanitation',
  'ماحول':'environment','آلودگی':'pollution environment','جنگل':'forest environment',
  'بجلی':'electricity energy','توانائی':'energy','شمسی':'solar energy',
  'سڑک':'road urban','ٹریفک':'traffic urban','شہر':'urban city','پل':'bridge urban',
  'معذور':'accessibility disability','وہیل چیئر':'wheelchair accessibility',
  'سرٹیفکیٹ':'certificate public administration','راشن':'ration public administration','اسکیم':'scheme public administration',
  'روزگار':'employment livelihood','معاش':'livelihood rural',
  // Odia
  'ପାଣି':'water drinking','ଜଳ':'water','ପାନୀୟ ଜଳ':'drinking water','ସେଚନ':'irrigation agriculture',
  'ଶିକ୍ଷା':'education school','ବିଦ୍ୟାଳୟ':'school education','ସ୍କୁଲ':'school education','ଛାତ୍ର':'student education','ଶିକ୍ଷକ':'teacher education',
  'ସ୍ୱାସ୍ଥ୍ୟ':'health healthcare','ହସ୍ପିଟାଲ':'hospital healthcare','ଡାକ୍ତର':'doctor healthcare','ଔଷଧ':'medicine healthcare',
  'କୃଷି':'agriculture','ଚାଷ':'agriculture crop','ଚାଷୀ':'farmer agriculture','ଫସଲ':'crop agriculture',
  'ଅବର୍ଜନା':'waste sanitation','ପରିଷ୍କାର':'sanitation cleanliness','ନାଳା':'drain sanitation','ପାଇଖାନା':'sanitation toilet',
  'ପରିବେଶ':'environment','ପ୍ରଦୂଷଣ':'pollution environment','ଜଙ୍ଗଲ':'forest environment',
  'ବିଦ୍ୟୁତ':'electricity energy','ଶକ୍ତି':'energy','ସୌର':'solar energy',
  'ରାସ୍ତା':'road urban','ଯାତାୟାତ':'traffic urban','ସହର':'urban city','ସେତୁ':'bridge urban',
  'ଦିବ୍ୟାଙ୍ଗ':'accessibility disability','ହ୍ୱିଲଚେୟାର':'wheelchair accessibility',
  'ପ୍ରମାଣପତ୍ର':'certificate public administration','ରାସନ':'ration public administration','ଯୋଜନା':'scheme public administration',
  'ରୋଜଗାର':'employment livelihood','ଜୀବିକା':'livelihood rural'
}
export function expandMultilingual(text=''){
  const raw=String(text).normalize('NFKC').toLowerCase(), hints=[]
  for(const [needle,english] of Object.entries(MULTILINGUAL_ALIASES)) if(raw.includes(needle)) hints.push(english)
  return `${raw} ${hints.join(' ')}`
}
export function tokenize(text=''){
  const words=expandMultilingual(text).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
  const toks=[...words]
  for(let i=0;i<words.length-1;i++) toks.push(`${words[i]}_${words[i+1]}`)
  return toks
}
export function train(examples){
  const labels=[...new Set(examples.map(x=>x.domain))].sort()
  const docsByLabel=Object.fromEntries(labels.map(l=>[l,0]))
  const tokenCounts=Object.fromEntries(labels.map(l=>[l,{}]))
  const totalTokens=Object.fromEntries(labels.map(l=>[l,0]))
  const vocab=new Set()
  for(const ex of examples){
    docsByLabel[ex.domain]++
    for(const t of tokenize(ex.text)){
      vocab.add(t); tokenCounts[ex.domain][t]=(tokenCounts[ex.domain][t]||0)+1; totalTokens[ex.domain]++
    }
  }
  return {kind:'multinomial-naive-bayes',labels,docCount:examples.length,docsByLabel,tokenCounts,totalTokens,vocabSize:vocab.size,trainedAt:new Date().toISOString()}
}
export function predict(model,text){
  const toks=tokenize(text)
  const V=Math.max(model.vocabSize,1),N=Math.max(model.docCount,1), scores=[]
  for(const label of model.labels){
    let s=Math.log((model.docsByLabel[label]+1)/(N+model.labels.length))
    const denom=(model.totalTokens[label]||0)+V
    const counts=model.tokenCounts[label]||{}
    for(const t of toks) s+=Math.log(((counts[t]||0)+1)/denom)
    scores.push([label,s])
  }
  scores.sort((a,b)=>b[1]-a[1])
  const max=scores[0]?.[1]??0
  const probs=scores.map(([l,s])=>[l,Math.exp(s-max)])
  const z=probs.reduce((a,x)=>a+x[1],0)||1
  const norm=probs.map(([l,p])=>[l,p/z])
  return {domain:norm[0]?.[0]||'Public Administration',confidence:norm[0]?.[1]||0,top:norm.slice(0,3).map(([domain,confidence])=>({domain,confidence}))}
}
export function evaluate(examples){
  const by={}; for(const e of examples)(by[e.domain]??=[]).push(e)
  const trainSet=[],testSet=[]
  for(const arr of Object.values(by)) arr.forEach((e,i)=>((i%4===0)?testSet:trainSet).push(e))
  const m=train(trainSet); let ok=0; const details=[]
  for(const e of testSet){const p=predict(m,e.text);const hit=p.domain===e.domain;if(hit)ok++;details.push({id:e.id,actual:e.domain,predicted:p.domain,confidence:p.confidence,hit})}
  return {accuracy:testSet.length?ok/testSet.length:1,correct:ok,total:testSet.length,trainCount:trainSet.length,testCount:testSet.length,details}
}

if(import.meta.url===`file://${process.argv[1]}`){
  const root=path.dirname(process.argv[1]), data=JSON.parse(fs.readFileSync(path.join(root,'data','training_sih2026.json'),'utf8'))
  const metrics=evaluate(data.examples), model=train(data.examples)
  model.metrics=metrics; model.source=data.source; model.taxonomy=data.taxonomy
  fs.writeFileSync(path.join(root,'data','classifier-model.json'),JSON.stringify(model,null,2))
  console.log(JSON.stringify({examples:data.examples.length,vocab:model.vocabSize,accuracy:+(metrics.accuracy*100).toFixed(1),correct:metrics.correct,total:metrics.total},null,2))
}
