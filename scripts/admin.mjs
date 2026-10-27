import {readConfig,UUID} from '../server/config.mjs';
import {createRepository} from '../server/repository.mjs';
const args=process.argv.slice(2),index=args.indexOf('--user'),userId=args[index+1];
if(index<0||!UUID.test(userId||'')||!args.includes('--confirm'))throw Error('Use --user <existing UUID> --confirm on your own installation');
const config=readConfig();if(!config.configured)throw Error('Complete your own installation settings first');
const repository=createRepository({config});await repository.assertInstallation();
const {data,error}=await repository.clientFactory('',true).auth.admin.getUserById(userId);if(error||!data.user)throw Error('User does not exist');
await repository.audit({actor:userId,action:'server_admin_grant_requested',target:userId});
await repository.adminWrite('wl_admins',{user_id:userId});console.log('Administrator assigned to the explicitly supplied UUID.');
