import {client} from './auth-client.mjs';
const $=id=>document.getElementById(id),notice=text=>$('notice').textContent=text;
async function api(path,body){const {data}=await client.auth.getSession();if(!data.session)throw Error('unauthorized');const r=await fetch('/api/admin/'+path,{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok)throw Error(result.error);return result;}
try{
 const data=await api('overview');$('management').hidden=false;
 for(const user of data.users){const row=document.createElement('tr');for(const value of [user.user_id,user.status,user.current_period_end?new Date(user.current_period_end).toLocaleString('ru-RU'):'—']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}$('users').append(row);}
 for(const plan of data.plans){const form=document.createElement('form');form.className='plan-form';
  for(const [key,label,type] of [['label','Название','text'],['days','Дни','number'],['amount_minor','Копейки RUB','number'],['stars_amount','Stars','number']]){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.name=key;input.type=type;input.value=plan[key];input.required=true;wrapper.append(input);form.append(wrapper);}
  const label=document.createElement('label');label.textContent='Включён';const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=plan.enabled;label.append(enabled);form.append(label);const save=document.createElement('button');save.textContent='Сохранить';form.append(save);
  form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{const value=Object.fromEntries(new FormData(form));for(const k of ['days','amount_minor','stars_amount'])value[k]=Number(value[k]);value.enabled=enabled.checked;await api('plans/'+plan.id,value);notice('Тариф сохранён.');}catch{notice('Не удалось сохранить тариф.');}finally{save.disabled=false;}});$('plans').append(form);
 }
 for(const item of data.audit){const li=document.createElement('li');li.textContent=item.created_at+' · '+item.action+' · '+item.actor;$('audit').append(li);}
 $('catalogForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('catalog/'+$('kind').value,JSON.parse($('catalog').value));notice('Каталог сохранён.');}catch{notice('Каталог не сохранён. Проверь JSON, уникальные ID и локальные пути без HTML.');}});
}catch{notice('Нет разрешения на управление. Администратор назначается владельцем на сервере.');}
