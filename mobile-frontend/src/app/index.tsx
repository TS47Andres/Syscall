import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Switch, TextInput, View, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { NotificationResponse } from 'expo-notifications';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, DisplayText } from '../components/Text';
import { Icon, type IconName } from '../components/Icon';
import { SyscallLogo } from '../components/SyscallLogo';
import { AuthScreen } from '../components/AuthScreen';
import { LoginSplashScreen } from '../components/LoginSplashScreen';
import { SarvamAIIcon } from '../components/SarvamAIIcon';
import { api, loadSession, setSession, type EncodedAttachment } from '../lib/api';
import { c } from '../lib/theme';
import { indiaCarriers } from '../lib/indiaCarriers';
import { t as translate } from '../lib/i18n';
import { type Draft, type Email, type FolderId, type User } from '../lib/types';

type Category = 'all'|'promotions'|'social'|'updates';
type SearchFilters = { from:string; to:string; subject:string; hasWords:string; hasAttachment:boolean; isStarred:boolean; isUnread:boolean; dateRange:string };
const emptyFilters: SearchFilters = {from:'',to:'',subject:'',hasWords:'',hasAttachment:false,isStarred:false,isUnread:false,dateRange:'all'};
const folders: { id: FolderId; icon: IconName }[] = [
  {id:'inbox',icon:'inbox'},{id:'starred',icon:'star'},{id:'snoozed',icon:'updates'},{id:'important',icon:'star'},
  {id:'sent',icon:'send'},{id:'drafts',icon:'mail'},{id:'scheduled',icon:'updates'},
  {id:'allmail',icon:'archive'},{id:'promotions',icon:'promotions'},{id:'social',icon:'social'},{id:'purchases',icon:'updates'},{id:'updates',icon:'updates'},{id:'spam',icon:'spam'},{id:'trash',icon:'trash'},
];
const LanguageContext = createContext('en');
function useTranslate() {
  const language = useContext(LanguageContext);
  return useCallback((key: string) => translate(key, language), [language]);
}
function folderLabel(folder: FolderId, tr: (key: string) => string) {
  const keyByFolder: Record<FolderId, string> = { inbox:'inbox',starred:'starred',snoozed:'snoozed',scheduled:'scheduled',sent:'sent',drafts:'drafts',allmail:'allmail',spam:'spam',trash:'bin',purchases:'purchases',social:'social',promotions:'promotions',updates:'updates',important:'important' };
  return tr(keyByFolder[folder]);
}

export default function MailApp() {
  const tr = useTranslate();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User|null>(null);
  const [booting, setBooting] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [now] = useState(() => Date.now());
  const [folder, setFolder] = useState<FolderId>('inbox');
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Email|null>(null);
  const [compose, setCompose] = useState(false);
  const [composeReply, setComposeReply] = useState<Email|null>(null);
  const [composeDraft, setComposeDraft] = useState<Email|null>(null);
  const [forward, setForward] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [profile, setProfile] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [inboxMenuOpen, setInboxMenuOpen] = useState(false);
  const [undoDeleteIds, setUndoDeleteIds] = useState<string[] | null>(null);
  const undoDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const trashedEmails = emails.filter((email) => email.isTrashed);

  const refresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true); setError('');
    try {
      const [mail,trash,drafts,scheduled]=await Promise.all([api.getMail(),api.getTrash(),api.getDrafts(),api.getScheduled()]);
      const draftMessages:Email[]=drafts.map((d:Draft)=>({publicId:d.publicId,senderAddress:user.emailAddress,recipientAddress:d.recipientAddress||'',subject:d.subject,textBody:d.textBody,createdAt:d.updatedAt,readAt:d.updatedAt,isDraft:true,attachments:d.attachments}));
      const scheduledMessages:Email[]=scheduled.map((m)=>({...m,senderAddress:user.emailAddress,textBody:m.textBody||'',readAt:m.createdAt,deliveryStatus:'scheduled'}));
      setEmails([...mail,...trash.map((m)=>({...m,isTrashed:true})),...draftMessages,...scheduledMessages]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load mail.'); }
    finally { setRefreshing(false); }
  }, [user]);
  useEffect(() => { void (async () => {
    try { const token = await loadSession(); if (token) setUser(await api.getMe()); }
    catch { await setSession(null); }
    finally { setBooting(false); }
  })(); }, []);
  const profileUserId = user?.id;
  useEffect(() => {
    if (!profileUserId) return;
    let active = true;
    void api.getProfile().then((profile) => {
      if (active) setUser((current) => current?.id === profileUserId ? { ...current, ...profile } : current);
    }).catch(() => { /* Keep the authenticated user visible if profile details are temporarily unavailable. */ });
    return () => { active = false; };
  }, [profileUserId]);
  useEffect(() => { if (user) void Promise.resolve().then(refresh); }, [user, refresh]);
  useEffect(() => () => { if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current); }, []);

  const openNotification = useCallback(async (emailId: string) => {
    try { setSelected(await api.getEmail(emailId)); void refresh(); }
    catch { Alert.alert('Message unavailable', 'This message could not be opened.'); }
  }, [refresh]);

  useEffect(() => {
    if (!user || Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    let active = true;
    let subscription: { remove: () => void }|undefined;
    void (async () => {
      try {
        // Expo Go (SDK 53+) does not include remote notifications. Keep this
        // module out of its startup path; load it only in a development build.
        const Notifications = await import('expo-notifications');
        if (!active) return;
        const openResponse = (response: NotificationResponse) => {
          const data = response.notification.request.content.data as { emailId?: string };
          if (data.emailId) void openNotification(data.emailId);
        };
        subscription = Notifications.addNotificationResponseReceivedListener(openResponse);
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) openResponse(lastResponse);
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('mail', { name: 'Mail', importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: c.blue });
        const current = await Notifications.getPermissionsAsync();
        const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
        if (!permission.granted) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        await api.registerPushDevice(token, Platform.OS as 'ios'|'android');
      } catch { /* Remote push credentials are configured in development builds. */ }
    })();
    return () => { active = false; subscription?.remove(); };
  }, [user, openNotification]);

  const visible = useMemo(() => {
    let items = [...emails];
    if (folder !== 'trash') items=items.filter((m)=>!m.isTrashed);
    if (folder !== 'spam') items=items.filter((m)=>!m.isSpam);
    if (folder !== 'drafts') items=items.filter((m)=>!m.isDraft);
    if (folder !== 'scheduled') items=items.filter((m)=>m.deliveryStatus!=='scheduled');
    if (['inbox','promotions','social','updates'].includes(folder)) items=items.filter((m)=>!m.isArchived);
    if (folder === 'starred') items = items.filter((m) => m.isStarred);
    else if (folder === 'important') items=items.filter((m)=>isImportant(m));
    else if (folder === 'snoozed') items=[];
    else if (folder === 'sent') items = items.filter((m) => m.isSender);
    else if (folder === 'drafts') items = items.filter((m) => m.isDraft);
    else if (folder === 'spam') items = items.filter((m) => m.isSpam);
    else if (folder === 'trash') items = items.filter((m) => m.isTrashed);
    else if (folder === 'scheduled') items = items.filter((m) => m.deliveryStatus === 'scheduled');
    else if (folder === 'promotions') items=items.filter((m)=>categoryMatch(m,'promotions'));
    else if (folder === 'social') items=items.filter((m)=>categoryMatch(m,'social'));
    else if (folder === 'updates') items=items.filter((m)=>categoryMatch(m,'updates'));
    else if (folder === 'purchases') items=items.filter((m)=>categoryMatch(m,'purchases'));
    else if (folder === 'inbox') items = items.filter((m) => !m.isSender);
    if (category !== 'all' && folder === 'inbox') items = items.filter((m) => categoryMatch(m,category));
    const q = query.trim().toLowerCase();
    if (q) items = items.filter((m) => [m.subject,m.textBody,m.senderAddress,m.senderName,m.recipientAddress].join(' ').toLowerCase().includes(q));
    const contains=(value:string,needle:string)=>!needle||value.toLowerCase().includes(needle.toLowerCase());
    items=items.filter((m)=>contains(m.senderAddress,filters.from)&&contains(m.recipientAddress,filters.to)&&contains(m.subject,filters.subject)&&contains(m.textBody,filters.hasWords)&&(!filters.hasAttachment||!!m.attachments?.length)&&(!filters.isStarred||!!m.isStarred)&&(!filters.isUnread||!m.readAt));
    if(filters.dateRange!=='all'){const days=filters.dateRange==='1d'?1:filters.dateRange==='3d'?3:filters.dateRange==='7d'?7:filters.dateRange==='30d'?30:365;const cutoff=now-days*86400000;items=items.filter((m)=>Date.parse(m.createdAt)>=cutoff);}
    return items.sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt));
  }, [emails, folder, category, query, filters, now]);

  const toggleStar = async (email: Email) => { const starred = !email.isStarred; setEmails((old) => old.map((m) => m.publicId === email.publicId ? {...m,isStarred:starred} : m)); setSelected((old)=>old?.publicId===email.publicId?{...old,isStarred:starred}:old);try { await api.setStar(email.publicId,starred); } catch { await refresh(); } };
  const openEmail = async (email: Email) => { if (selection.length) { toggleSelected(email.publicId); return; } if(email.isDraft){setComposeDraft(email);setComposeReply(null);setForward(false);setCompose(true);return;} setSelected(email); if (!email.readAt) { setEmails((old) => old.map((m) => m.publicId === email.publicId ? {...m,readAt:new Date().toISOString()} : m)); void api.setRead(email.publicId,true); } };
  const toggleSelected = (id: string) => setSelection((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old,id]);
  const showDeleteUndo = (ids: string[]) => {
    if (!ids.length) return;
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
    setUndoDeleteIds(ids);
    undoDeleteTimer.current = setTimeout(() => { setUndoDeleteIds(null); undoDeleteTimer.current = null; }, 7000);
  };
  const restoreMessages = async (ids: string[]): Promise<boolean> => {
    if (!ids.length) return false;
    try { await Promise.all(ids.map((id) => api.restoreEmail(id))); setSelection([]); await refresh(); return true; }
    catch (e) { Alert.alert('Could not recover mail', e instanceof Error ? e.message : 'Try again.'); return false; }
  };
  const permanentlyDeleteMessages = async (ids: string[]) => {
    if (!ids.length) return;
    try { await Promise.all(ids.map((id) => api.permanentlyDeleteEmail(id))); setSelection([]); await refresh(); }
    catch (e) { Alert.alert('Could not delete mail', e instanceof Error ? e.message : 'Try again.'); await refresh(); }
  };
  const confirmTrashDelete = () => {
    const selectedIds = [...selection];
    const deletingAll = selectedIds.length === 0;
    const count = deletingAll ? trashedEmails.length : selectedIds.length;
    if (!count) return;
    Alert.alert(deletingAll ? 'Delete all mail permanently?' : 'Delete selected mail permanently?', deletingAll ? 'All messages in Trash will be permanently deleted and cannot be recovered.' : `${count} message${count===1?'':'s'} cannot be recovered after deletion.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: deletingAll ? 'Delete all' : 'Delete permanently', style: 'destructive', onPress: () => {
        if (deletingAll) void (async () => { try { await api.emptyTrash(); setSelection([]); await refresh(); } catch (e) { Alert.alert('Could not empty Trash', e instanceof Error ? e.message : 'Try again.'); } })();
        else void permanentlyDeleteMessages(selectedIds);
      } },
    ]);
  };
  const confirmRecoverMessages = (ids: string[], closeReader = false) => {
    if (!ids.length) return;
    Alert.alert(ids.length === 1 ? 'Recover this message?' : 'Recover these messages?', 'The selected mail will be moved back to your mailbox.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Recover', onPress: () => { void (async () => { const recovered = await restoreMessages(ids); if (recovered && closeReader) setSelected(null); })(); } },
    ]);
  };
  const confirmMoveToTrash = (ids: string[], closeReader = false) => {
    if (!ids.length) return;
    Alert.alert(ids.length === 1 ? 'Move this message to Trash?' : 'Move selected messages to Trash?', 'You can recover these messages from Trash.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Move to Trash', style: 'destructive', onPress: () => { void (async () => {
        try { await api.batchMailAction(ids,'trash'); setSelection([]); if (closeReader) setSelected(null); await refresh(); showDeleteUndo(ids); }
        catch (e) { Alert.alert('Could not delete mail', e instanceof Error ? e.message : 'Try again.'); }
      })(); } },
    ]);
  };
  const confirmPermanentDeleteOne = (email: Email) => {
    Alert.alert('Delete this message permanently?', 'This message cannot be recovered after deletion.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete permanently', style: 'destructive', onPress: () => { void permanentlyDeleteMessages([email.publicId]); setSelected(null); } },
    ]);
  };
  const undoDelete = async () => {
    const ids = undoDeleteIds || [];
    if (undoDeleteTimer.current) clearTimeout(undoDeleteTimer.current);
    undoDeleteTimer.current = null;
    setUndoDeleteIds(null);
    await restoreMessages(ids);
  };
  const doBatch = async (action: 'read'|'unread'|'trash'|'archive') => { const ids = [...selection]; if (action === 'trash') { confirmMoveToTrash(ids); return; } setSelection([]); try { await api.batchMailAction(ids,action); await refresh(); } catch (e) { Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again.'); } };
  const openInboxMenu = () => setInboxMenuOpen(true);
  const runInboxAction = async (action: 'select'|'read'|'unread') => {
    setInboxMenuOpen(false);
    const allIds = visible.map((email) => email.publicId);
    if (allIds.length === 0) return;
    if (action === 'select') { setSelection(allIds); return; }
    try { await api.batchMailAction(allIds, action); await refresh(); }
    catch (e) { Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again.'); }
  };
  const recoverTrashAction = () => { const ids = selection.length ? [...selection] : trashedEmails.map((email) => email.publicId); confirmRecoverMessages(ids); };
  const signOut = async () => { await api.logout(); setUser(null); setEmails([]); setProfile(false); };
  const handleSignIn = (signedInUser: User) => { setUser(signedInUser); setShowSplash(true); };

  if (booting) return <View style={s.loading}><ActivityIndicator color={c.blue}/></View>;
  if (!user) return <AuthScreen onSignedIn={handleSignIn}/>;

  return <LanguageContext.Provider value={user?.language || 'en'}><View style={[s.screen,{paddingTop:insets.top}]}>
    <StatusBar barStyle="dark-content" backgroundColor={c.bg}/>
    <View style={s.header}>
      {selection.length ? <View style={s.selectionBar}>
        <Pressable style={s.iconButton} onPress={() => setSelection([])} accessibilityLabel="Clear selection"><Icon name="back"/></Pressable><Text style={s.selectedCount}>{selection.length} {tr('selected_count')}</Text>{folder==='trash'?<><Pressable onPress={recoverTrashAction} accessibilityRole="button" accessibilityLabel="Recover selected mail" style={{width:52,height:50,alignItems:'center',justifyContent:'center',gap:2}}><Icon name="restore" size={19}/><Text style={{fontSize:9,color:c.sub}}>Recover</Text></Pressable><Pressable onPress={confirmTrashDelete} accessibilityRole="button" accessibilityLabel="Delete selected mail permanently" style={{width:52,height:50,alignItems:'center',justifyContent:'center',gap:2}}><Icon name="trash" size={19}/><Text style={{fontSize:9,color:c.sub}}>Delete</Text></Pressable><Pressable style={s.iconButton} onPress={() => void doBatch('unread')} accessibilityRole="button" accessibilityLabel="Mark selected as unread"><Icon name="mailUnread" size={19}/></Pressable></>:<><Pressable style={s.iconButton} onPress={() => void doBatch('archive')} accessibilityLabel="Archive selected mail"><Icon name="archive"/></Pressable><Pressable style={s.iconButton} onPress={() => void doBatch('trash')} accessibilityLabel="Delete selected mail"><Icon name="trash"/></Pressable><Pressable style={s.iconButton} onPress={() => void doBatch('read')} accessibilityRole="button" accessibilityLabel="Mark selected as read"><Icon name="mail"/></Pressable><Pressable style={s.iconButton} onPress={() => void doBatch('unread')} accessibilityRole="button" accessibilityLabel="Mark selected as unread"><Icon name="mailUnread" size={19}/></Pressable></>}
      </View> : <>
        <View style={s.searchPill}>
          <Pressable onPress={() => setDrawer(true)} style={s.menuButton}><Icon name="menu" size={20}/></Pressable>
          <TextInput value={query} onChangeText={setQuery} placeholder="Syscall" placeholderTextColor={c.sub} style={s.searchInput} returnKeyType="search"/>
          {!!query && <Pressable style={s.clearSearch} onPress={() => setQuery('')}><Icon name="close" size={16}/></Pressable>}
          <Pressable style={[s.filterButton,(filterOpen||Object.values(filters).some((v)=>v!==''&&v!==false&&v!=='all'))&&s.filterActive]} onPress={()=>setFilterOpen(true)}><Icon name="filter" size={18} color={Object.values(filters).some((v)=>v!==''&&v!==false&&v!=='all')?c.blue:c.sub}/></Pressable>
        </View>
        <Pressable onPress={() => setProfile(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Open profile" style={s.avatar}>
          {user.avatarUrl ? <Image source={{uri:user.avatarUrl}} style={s.avatarImage}/> : <Text style={s.avatarText}>{initials(user.name)}</Text>}
        </Pressable>
      </>}
    </View>
    {folder === 'inbox' && !selection.length ? <View style={s.tabsBar}>
      <Pressable style={s.tabsMore} onPress={openInboxMenu} accessibilityRole="button" accessibilityLabel="Inbox options"><Text style={s.moreGlyph}>⋮</Text></Pressable>
      <View style={s.tabsDivider}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsWrap} contentContainerStyle={[s.tabs,{paddingRight:54}]}>
        {([['all','inbox','primary'],['promotions','promotions','promotions'],['social','social','social'],['updates','updates','updates']] as const).map(([id,icon,label]) => <Pressable key={id} onPress={() => setCategory(id)} style={[s.tab,category===id&&s.activeTab]}><Icon name={icon} size={15} color={category===id?'#041E49':c.sub}/><Text style={[s.tabText,category===id&&s.activeTabText]}>{tr(label)}</Text></Pressable>)}
      </ScrollView>
      <Pressable style={s.tabsRefresh} onPress={() => void refresh()} accessibilityRole="button" accessibilityLabel="Refresh mail"><Icon name="refresh" size={16}/></Pressable>
    </View> : <View style={[s.folderTitle,folder==='trash'&&{height:68,paddingHorizontal:12}]}>
      <Text style={s.folderTitleText}>{folderLabel(folder,tr)}</Text>
      {folder==='trash' ? <View style={{flexDirection:'row',alignItems:'center',gap:2}}>
        {!selection.length ? <>
          <Pressable onPress={recoverTrashAction} disabled={!trashedEmails.length} accessibilityRole="button" accessibilityLabel="Recover all mail" style={{width:54,height:60,alignItems:'center',justifyContent:'center',gap:2,opacity:trashedEmails.length?1:.45}}><Icon name="restore" size={19} color={c.blue}/><Text style={{fontSize:10,color:c.blue}}>Recover</Text></Pressable>
          <Pressable onPress={confirmTrashDelete} disabled={!trashedEmails.length} accessibilityRole="button" accessibilityLabel="Delete all mail permanently" style={{width:54,height:60,alignItems:'center',justifyContent:'center',gap:2,opacity:trashedEmails.length?1:.45}}><Icon name="trash" size={19} color="#B3261E"/><Text style={{fontSize:10,color:'#B3261E'}}>Delete</Text></Pressable>
        </> : null}
        <Pressable onPress={() => void refresh()} style={s.iconButton} accessibilityLabel="Refresh Trash"><Icon name="refresh" size={18}/></Pressable>
      </View> : <Pressable onPress={() => void refresh()}><Icon name="refresh" size={18}/></Pressable>}
    </View>}
    <Modal transparent visible={inboxMenuOpen} animationType="fade" onRequestClose={() => setInboxMenuOpen(false)}>
      <View style={s.menuOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setInboxMenuOpen(false)}/><View style={[s.inboxMenu,{top:insets.top+110}]}>
        <Pressable style={s.inboxMenuItem} onPress={() => runInboxAction('select')}><Icon name="check" size={17}/><Text style={s.inboxMenuText}>{tr('select_all')}</Text></Pressable>
        <Pressable style={s.inboxMenuItem} onPress={() => void runInboxAction('read')}><Icon name="mail" size={17}/><Text style={s.inboxMenuText}>{tr('mark_as_read')}</Text></Pressable>
        <Pressable style={s.inboxMenuItem} onPress={() => void runInboxAction('unread')}><Icon name="mail" size={17}/><Text style={s.inboxMenuText}>{tr('mark_as_unread')}</Text></Pressable>
      </View></View>
    </Modal>
    {error ? <Pressable onPress={() => void refresh()} style={s.errorBanner}><Text style={s.errorText}>{error}  ·  Tap to retry</Text></Pressable> : null}
    <FlatList data={visible} keyExtractor={(item) => item.publicId} renderItem={({item}) => <EmailRow email={item} folder={folder} selected={selection.includes(item.publicId)} onPress={() => void openEmail(item)} onStar={() => void toggleStar(item)} onLongPress={() => { Vibration.vibrate(35); toggleSelected(item.publicId); }}/>} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={c.blue} colors={[c.blue]}/>} ListEmptyComponent={!refreshing ? <View style={s.empty}><View style={s.emptyIcon}><Icon name="mail" size={30} color="#9AA0A6"/></View><Text style={s.emptyText}>{query ? 'No messages match your search' : 'No messages here'}</Text></View> : null} contentContainerStyle={visible.length?undefined:{flexGrow:1}}/>
    {!selection.length && folder !== 'drafts' && <Pressable onPress={() => setCompose(true)} style={[s.fab,{bottom:16+insets.bottom}]}><Icon name="compose" color={c.composeText} size={20}/><Text style={s.fabText}>{tr('compose')}</Text></Pressable>}
    {undoDeleteIds ? <View pointerEvents="box-none" style={{position:'absolute',left:12,right:12,bottom:insets.bottom+12,zIndex:30,elevation:20}}><View style={{minHeight:52,paddingHorizontal:16,borderRadius:12,backgroundColor:'#303134',flexDirection:'row',alignItems:'center',gap:12,elevation:8}}><Text style={{flex:1,color:'#FFFFFF',fontSize:13}}>Mail moved to Trash</Text><Pressable onPress={()=>void undoDelete()} hitSlop={8}><Text style={{color:'#A8C7FA',fontSize:13,fontWeight:'700'}}>Undo</Text></Pressable><Pressable onPress={()=>{if(undoDeleteTimer.current)clearTimeout(undoDeleteTimer.current);undoDeleteTimer.current=null;setUndoDeleteIds(null);}} hitSlop={8} accessibilityLabel="Dismiss"><Icon name="close" size={17} color="#FFFFFF"/></Pressable></View></View> : null}
    <Drawer visible={drawer} user={user} folder={folder} onClose={() => setDrawer(false)} onChoose={(id) => { setFolder(id); setCategory('all'); setSelection([]); setDrawer(false); }} onProfile={() => { setDrawer(false); setProfile(true); }}/>
    <FilterSheet key={filterOpen?'filters-open':'filters-closed'} visible={filterOpen} initial={filters} onClose={()=>setFilterOpen(false)} onApply={(value)=>{setFilters(value);setFilterOpen(false);}} onReset={()=>{setFilters(emptyFilters);setFilterOpen(false);}}/>
    <Reader email={selected} user={user} onClose={() => setSelected(null)} onStar={toggleStar} onDelete={async (email) => {if(email.isTrashed)confirmPermanentDeleteOne(email);else confirmMoveToTrash([email.publicId],true);}} onRestore={async(email)=>{confirmRecoverMessages([email.publicId],true);}} onArchive={async(email)=>{await api.batchMailAction([email.publicId],'archive');setSelected(null);await refresh();}} onReply={(email) => { setForward(false);setComposeReply(email); setSelected(null); setCompose(true); }} onForward={(email)=>{setForward(true);setComposeReply(email);setSelected(null);setCompose(true);}}/>
    <Composer key={`${composeDraft?.publicId||composeReply?.publicId||'new-compose'}-${forward?'forward':composeReply?'reply':'new'}`} visible={compose} draft={composeDraft} replyTo={composeReply} forward={forward} mailDomain={user.emailAddress.split('@')[1]||'niti'} onClose={() => {setCompose(false);setComposeReply(null);setComposeDraft(null);setForward(false);}} onSent={() => { setCompose(false);setComposeReply(null);setComposeDraft(null);setForward(false);void refresh(); }}/>
    <Profile key={profile ? 'profile-open' : 'profile-closed'} visible={profile} user={user} onClose={() => setProfile(false)} onUser={(u) => setUser(u)} onLogout={() => void signOut()}/>
    {showSplash ? <LoginSplashScreen onFinish={() => setShowSplash(false)}/> : null}
  </View></LanguageContext.Provider>;
}

function categoryMatch(m: Email,category: Category|'purchases') { const t=`${m.subject} ${m.textBody}`.toLowerCase(); if(category==='promotions')return ['promo','offer','discount','sale','deal','coupon','save ','special'].some((word)=>t.includes(word));if(category==='social')return ['social','connect','network','linkedin','twitter','instagram','facebook','youtube','community','invite'].some((word)=>t.includes(word));if(category==='updates')return ['update','notification','confirm','receipt','bill','statement','alert','security','verify','welcome','telecom','account'].some((word)=>t.includes(word));if(category==='purchases')return ['purchase','order','invoice','receipt','bill','payment','transaction','paid'].some((word)=>t.includes(word));return true; }
function isImportant(m:Email){const t=`${m.subject} ${m.textBody}`.toLowerCase();return m.isStarred||['important','urgent','otp','security','telecom','alert','welcome'].some((word)=>t.includes(word));}
function initials(name?: string) { return name?.trim().split(/\s+/).map((p) => p[0]).join('').slice(0,2).toUpperCase() || 'SY'; }
function parseLocalDate(value:string) { const [year,month,day]=value.split('-').map(Number);return year&&month&&day?new Date(year,month-1,day,12):new Date(NaN); }
function localDateValue(date:Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function ageAt(date: string, now: Date) { const birth=parseLocalDate(date);if(Number.isNaN(birth.getTime()))return null;let age=now.getFullYear()-birth.getFullYear();if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;return age>=0?age:null; }
function colorFor(s: string) { const colors=['#E8DEF8','#D3E3FD','#C2E7FF','#C4EDD9','#FFD8D8','#FFE7A5','#E0F2FE']; let hash=0; for (const ch of s) hash+=ch.charCodeAt(0); return colors[hash%colors.length]; }
function phoneFormat(addr: string) { const digits=addr.replace(/\D/g,'').slice(-10); return digits.length===10?`+91 ${digits.slice(0,5)} ${digits.slice(5)}`:addr; }
function emailDate(value: string) { const d=new Date(value); const now=new Date(); return d.toDateString()===now.toDateString()?d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'}); }

function EmailRow({email,folder,selected,onPress,onStar,onLongPress}:{email:Email;folder:FolderId;selected:boolean;onPress:()=>void;onStar:()=>void;onLongPress:()=>void}) {
  const isUnread=!email.readAt; const recipient=folder==='sent'||(email.isSender&&folder!=='drafts'&&folder!=='scheduled'); const address=recipient?email.recipientAddress:email.senderAddress; const name=recipient?email.recipientName:email.senderName;
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null); const long=useRef(false);
  return <Pressable onPress={() => { if(long.current){long.current=false;return;} onPress(); }} onPressIn={() => {long.current=false;timer.current=setTimeout(()=>{long.current=true;onLongPress();},450);}} onPressOut={() => {if(timer.current)clearTimeout(timer.current);}} style={[s.row,{backgroundColor:selected?c.compose:isUnread?'#FFFFFF':c.bg}]}>
    <Pressable onPress={(e) => {e.stopPropagation();onStar();}} hitSlop={4} style={s.star}><Icon name="star" size={17} color={email.isStarred?c.star:'#BDC1C6'} filled={!!email.isStarred}/></Pressable>
    <View style={[s.senderAvatar,{backgroundColor:colorFor(address)}]}><Text style={s.senderAvatarText}>{(name?.trim()||address).slice(0,2).toUpperCase()}</Text></View>
    <View style={s.senderColumn}><Text numberOfLines={1} style={[s.senderName,{fontWeight:isUnread?'700':'400'}]}>{name?.trim()||phoneFormat(address)}</Text></View>
    <View style={s.snippetColumn}><Text numberOfLines={1} style={[s.subject,{fontWeight:isUnread?'700':'400',color:isUnread?c.text:c.sub}]}>{email.subject || '(no subject)'}<Text style={s.snippet}>  -  {email.textBody?.replace(/\s+/g,' ').trim()}</Text></Text></View>
    <View style={s.rowRight}>{email.attachments?.length ? <View style={s.attachBadge}><Icon name="attach" size={11} color={c.green}/><Text style={s.attachCount}>{email.attachments.length}</Text></View> : null}<Text numberOfLines={1} style={s.date}>{emailDate(email.createdAt)}</Text></View>
  </Pressable>;
}

function FilterSheet({visible,initial,onClose,onApply,onReset}:{visible:boolean;initial:SearchFilters;onClose:()=>void;onApply:(filters:SearchFilters)=>void;onReset:()=>void}) {
  const tr = useTranslate();
  const insets=useSafeAreaInsets();const [draft,setDraft]=useState(initial);
  const set=(key:keyof SearchFilters,value:string|boolean)=>setDraft((old)=>({...old,[key]:value}));
  const dateOptions=[['all','All time'],['1d','Last 24h'],['7d','7 days'],['30d','30 days'],['1y','1 year']];
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.filterBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><View style={[s.filterPanel,{paddingTop:insets.top+54}]}>
    <View style={s.filterCard}><View style={s.filterHeader}><Text style={s.filterTitle}>{tr('search_options')}</Text><Pressable onPress={onClose} style={s.iconButton}><Icon name="close" size={18}/></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.filterBody}><Text style={s.filterLabel}>{tr('filter_from')}</Text><TextInput value={draft.from} onChangeText={(v)=>set('from',v)} placeholder={tr('filter_from')} placeholderTextColor={c.light} style={s.filterInput}/><Text style={s.filterLabel}>{tr('filter_to')}</Text><TextInput value={draft.to} onChangeText={(v)=>set('to',v)} placeholder={tr('filter_to')} placeholderTextColor={c.light} style={s.filterInput}/><Text style={s.filterLabel}>{tr('filter_subject')}</Text><TextInput value={draft.subject} onChangeText={(v)=>set('subject',v)} placeholder={tr('filter_subject')} placeholderTextColor={c.light} style={s.filterInput}/><Text style={s.filterLabel}>{tr('filter_words')}</Text><TextInput value={draft.hasWords} onChangeText={(v)=>set('hasWords',v)} placeholder={tr('filter_words')} placeholderTextColor={c.light} style={s.filterInput}/>
        <View style={s.filterSwitchRow}><Text style={s.filterSwitchLabel}>{tr('filter_has_attachment')}</Text><Switch value={draft.hasAttachment} onValueChange={(v)=>set('hasAttachment',v)} trackColor={{false:'#DADCE0',true:'#A8C7FA'}} thumbColor={draft.hasAttachment?c.blue:'#F4F4F4'}/></View><View style={s.filterSwitchRow}><Text style={s.filterSwitchLabel}>{tr('filter_starred')}</Text><Switch value={draft.isStarred} onValueChange={(v)=>set('isStarred',v)} trackColor={{false:'#DADCE0',true:'#A8C7FA'}} thumbColor={draft.isStarred?c.blue:'#F4F4F4'}/></View><View style={s.filterSwitchRow}><Text style={s.filterSwitchLabel}>{tr('filter_unread')}</Text><Switch value={draft.isUnread} onValueChange={(v)=>set('isUnread',v)} trackColor={{false:'#DADCE0',true:'#A8C7FA'}} thumbColor={draft.isUnread?c.blue:'#F4F4F4'}/></View>
        <Text style={[s.filterLabel,{marginTop:12}]}>{tr('filter_date')}</Text><View style={s.dateChoices}>{dateOptions.map(([id,key])=><Pressable key={id} onPress={()=>set('dateRange',id)} style={[s.dateChip,draft.dateRange===id&&s.dateChipActive]}><Text style={[s.dateChipText,draft.dateRange===id&&s.dateChipTextActive]}>{tr(id==='all'?'date_all':id==='1d'?'date_1d':id==='7d'?'date_7d':id==='30d'?'date_1m':'date_1y')}</Text></Pressable>)}</View>
      </ScrollView><View style={s.filterFooter}><Pressable onPress={onReset} style={s.filterReset}><Text style={s.filterResetText}>{tr('filter_reset')}</Text></Pressable><View style={{flex:1}}/><Pressable onPress={()=>onApply(draft)} style={s.filterApply}><Text style={s.filterApplyText}>{tr('filter_apply')}</Text></Pressable></View>
    </View>
  </View></View></Modal>;
}

function Drawer({visible,user,folder,onClose,onChoose,onProfile}:{visible:boolean;user:User;folder:FolderId;onClose:()=>void;onChoose:(id:FolderId)=>void;onProfile:()=>void}) {
  const tr = useTranslate();
  const insets=useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={s.modalScrim}><Pressable style={StyleSheet.absoluteFill} onPress={onClose}/><View style={[s.drawer,{paddingTop:insets.top+8,paddingBottom:insets.bottom+8}]}>
    <View style={s.drawerBrand}><SyscallLogo size={36}/><DisplayText style={s.drawerBrandName}>Syscall</DisplayText></View>
    <ScrollView showsVerticalScrollIndicator={false}>{folders.map(({id,icon})=><Pressable key={id} onPress={()=>onChoose(id)} style={[s.folderItem,folder===id&&s.folderActive]}><Icon name={icon} size={19} color={folder===id?c.blue:c.sub}/><Text style={[s.folderLabel,folder===id&&s.folderLabelActive]}>{folderLabel(id,tr)}</Text></Pressable>)}</ScrollView>
    <Pressable onPress={onProfile} style={s.drawerAccount}>{user.avatarUrl?<Image source={{uri:user.avatarUrl}} style={s.drawerAvatar}/>:<View style={[s.drawerAvatar,{backgroundColor:c.blue}]}><Text style={s.avatarText}>{initials(user.name)}</Text></View>}<View style={{flex:1}}><Text numberOfLines={1} style={s.accountName}>{user.name||'Your account'}</Text><Text numberOfLines={1} style={s.accountEmail}>{user.emailAddress}</Text></View><Icon name="chevron" size={17}/></Pressable>
  </View></View></Modal>;
}

function Reader({email,user,onClose,onStar,onDelete,onRestore,onArchive,onReply,onForward}:{email:Email|null;user:User;onClose:()=>void;onStar:(email:Email)=>void;onDelete:(email:Email)=>Promise<void>;onRestore:(email:Email)=>Promise<void>;onArchive:(email:Email)=>Promise<void>;onReply:(email:Email)=>void;onForward:(email:Email)=>void}) {
  const insets=useSafeAreaInsets(); if(!email)return null; const sender=email.isSender?user.emailAddress:email.senderAddress; const name=email.isSender?'You':email.senderName||sender;
  const download=async(index:number)=>{try{const asset=await api.downloadAttachment(email.publicId,index);const file=new ExpoFile(Paths.cache,asset.filename.replace(/[\\/:*?"<>|]/g,'_'));file.write(asset.contentBase64,{encoding:'base64'});if(await Sharing.isAvailableAsync())await Sharing.shareAsync(file.uri,{mimeType:asset.contentType,dialogTitle:asset.filename});else Alert.alert('Attachment saved',file.uri);}catch(e){Alert.alert('Could not open attachment',e instanceof Error?e.message:'Try again.');}};
  return <Modal visible animationType="slide" onRequestClose={onClose}><View style={[s.reader,{paddingTop:insets.top}]}>
    <View style={s.readerToolbar}><Pressable style={s.iconButton} onPress={onClose}><Icon name="back"/></Pressable><View style={{flex:1}}/>{email.isTrashed?<Pressable style={s.iconButton} onPress={()=>void onRestore(email)}><Icon name="restore"/></Pressable>:<Pressable style={s.iconButton} onPress={()=>void onArchive(email)}><Icon name="archive"/></Pressable>}<Pressable style={s.iconButton} onPress={()=>void onDelete(email)}><Icon name="trash"/></Pressable><Pressable style={s.iconButton} onPress={()=>onStar(email)}><Icon name="star" color={email.isStarred?c.star:c.sub} filled={!!email.isStarred}/></Pressable><Pressable style={s.iconButton}><Icon name="more"/></Pressable></View>
    <ScrollView style={s.readerScroll} contentContainerStyle={s.readerContent}><DisplayText style={s.readerSubject}>{email.subject||'(no subject)'}</DisplayText><View style={s.senderDetails}><View style={[s.senderAvatar,s.readerAvatar,{backgroundColor:colorFor(sender)}]}><Text style={s.senderAvatarText}>{(name||sender).slice(0,2).toUpperCase()}</Text></View><View style={{flex:1}}><View style={s.senderHeadline}><Text style={s.readerSender}>{name}</Text><Text style={s.readerDate}>{emailDate(email.createdAt)}</Text></View><Text style={s.readerAddress}>to {email.isSender?email.recipientAddress:'me'} · details</Text></View><Pressable style={s.iconButton}><Icon name="reply" size={18}/></Pressable></View><Text selectable style={s.bodyText}>{email.textBody||' '}</Text>
      {email.attachments?.length? <View style={s.attachments}>{email.attachments.map((a,i)=><Pressable key={`${a.filename}-${i}`} onPress={()=>void download(i)} style={s.attachment}><Icon name="attach" size={17} color={c.blue}/><View style={{flex:1}}><Text numberOfLines={1} style={s.attachmentName}>{a.filename}</Text><Text style={s.attachmentSize}>{(a.sizeBytes/1024).toFixed(0)} KB · Tap to open</Text></View></Pressable>)}</View>:null}
      <View style={s.replyButtons}><Pressable onPress={()=>onReply(email)} style={s.replyButton}><Icon name="reply" size={17}/><Text style={s.replyText}>Reply</Text></Pressable><Pressable onPress={()=>onForward(email)} style={s.replyButton}><Icon name="forward" size={17}/><Text style={s.replyText}>Forward</Text></Pressable></View>
    </ScrollView>
  </View></Modal>;
}

function Composer({visible,draft,replyTo,forward,mailDomain,onClose,onSent}:{visible:boolean;draft:Email|null;replyTo:Email|null;forward:boolean;mailDomain:string;onClose:()=>void;onSent:()=>void}) {
  const tr=useTranslate();
  const insets=useSafeAreaInsets();
  const [to,setTo]=useState(draft?.recipientAddress|| (replyTo&&!forward?(replyTo.isSender?replyTo.recipientAddress:replyTo.senderAddress):''));
  const [subject,setSubject]=useState(draft?.subject || (replyTo?`${forward?'Fwd':'Re'}: ${replyTo.subject.replace(/^(re|fwd):\s*/i,'')}`:''));
  const [body,setBody]=useState(draft?.textBody || (forward&&replyTo?`\n\n---------- Forwarded message ----------\nFrom: ${replyTo.senderAddress}\nSubject: ${replyTo.subject}\n\n${replyTo.textBody}`:''));
  const [aiPrompt,setAiPrompt]=useState(''); const [generating,setGenerating]=useState(false); const [sending,setSending]=useState(false); const [pickerMinimum]=useState(()=>new Date()); const [scheduleDefault]=useState(()=>new Date(Date.now()+3600000));
  const [attachments,setAttachments]=useState<EncodedAttachment[]>([]); const [scheduledAt,setScheduledAt]=useState<Date|null>(null);
  const [showSchedule,setShowSchedule]=useState(false); const [schedulePickerMode,setSchedulePickerMode]=useState<'date'|'time'|null>(null); const [minimized,setMinimized]=useState(false); const [error,setError]=useState('');
  const normalizedTo=()=>{const value=to.trim();if(value.includes('@')){const phone=value.split('@')[0].replace(/\D/g,'').slice(-10);return phone.length===10?`${phone}@${mailDomain}`:value;}const digits=value.replace(/\D/g,'').slice(-10);return digits.length===10?`${digits}@${mailDomain}`:value;};
  const pickFiles=async()=>{try{const result=await DocumentPicker.getDocumentAsync({multiple:true,copyToCacheDirectory:true});if(result.canceled)return;const picked=await Promise.all(result.assets.map(async(asset)=>({filename:asset.name,contentType:asset.mimeType||'application/octet-stream',contentBase64:await new ExpoFile(asset.uri).base64()})));setAttachments((current)=>[...current,...picked]);}catch(e){Alert.alert('Could not attach files',e instanceof Error?e.message:'Try again.');}};
  const resetForm=()=>{setTo('');setSubject('');setBody('');setAiPrompt('');setAttachments([]);setScheduledAt(null);setShowSchedule(false);setError('');};
  const saveDraft=async()=>{setSending(true);setError('');try{const value={recipientAddress:to.trim()||null,subject,textBody:body};if(draft)await api.updateDraft(draft.publicId,value,attachments.length?attachments:undefined);else await api.createDraft(value,attachments);resetForm();onSent();}catch(e){setError(e instanceof Error?e.message:'Could not save draft.');}finally{setSending(false);}};
  const send=async()=>{const recipient=normalizedTo();if(!to.trim()){setError('Enter a mobile number or Syscall address.');return;}if(!/^\d{10}@[^@]+$/.test(recipient)||!recipient.endsWith(`@${mailDomain}`)){setError(`Enter a valid 10-digit Syscall address ending in @${mailDomain}.`);return;}if(!subject.trim()){setError('Please enter a subject.');return;}if(scheduledAt&&scheduledAt.getTime()<=Date.now()){setError('Choose a future delivery time.');return;}setSending(true);setError('');try{if(scheduledAt){if(draft||replyTo)throw new Error('Schedule is available for a new message.');await api.scheduleMail({to:recipient,subject,textBody:body,scheduledAt:scheduledAt.toISOString(),attachments});}else if(draft){await api.updateDraft(draft.publicId,{recipientAddress:recipient,subject,textBody:body},attachments.length?attachments:undefined);await api.sendDraft(draft.publicId);}else if(replyTo&&!forward)await api.replyToEmail(replyTo.publicId,body,attachments);else await api.sendMail(recipient,subject,body,attachments);resetForm();onSent();}catch(e){setError(e instanceof Error?e.message:'Could not send.');}finally{setSending(false);}};
  const generate=async()=>{if(!aiPrompt.trim())return;setGenerating(true);setError('');try{const result=await api.generateEmailDraft({prompt:aiPrompt.trim(),subject,textBody:body});setSubject(result.subject);setBody(result.textBody);}catch(e){setError(e instanceof Error?e.message:'Could not write this message.');}finally{setGenerating(false);}};
  const close=()=>{setSchedulePickerMode(null);setMinimized(false);resetForm();onClose();};
  const updateSchedule=(date?:Date)=>{if(!date||!schedulePickerMode)return;setScheduledAt((current)=>{const next=new Date(current||Date.now());if(schedulePickerMode==='date')next.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());else next.setHours(date.getHours(),date.getMinutes(),0,0);return next;});if(Platform.OS==='android')setSchedulePickerMode(null);};
  const picker=<DateTimePicker value={scheduledAt||scheduleDefault} mode={schedulePickerMode||'date'} display={Platform.OS==='ios'?'spinner':schedulePickerMode==='date'?'calendar':'clock'} minimumDate={pickerMinimum} onValueChange={(_,date)=>updateSchedule(date)} onDismiss={()=>setSchedulePickerMode(null)}/>;
  if(!visible)return null;
  if(minimized)return <Modal visible transparent animationType="fade" onRequestClose={close}><View style={s.minimizedComposeWrap}><Pressable onPress={()=>setMinimized(false)} style={s.minimizedCompose}><Icon name="compose" color={c.blue} size={18}/><Text numberOfLines={1} style={s.minimizedComposeText}>{subject.trim()||tr('new_message')}</Text><Pressable onPress={close} hitSlop={8}><Icon name="close" size={17}/></Pressable></Pressable></View></Modal>;
  return <Modal visible transparent animationType="slide" onRequestClose={close}><View style={s.composeBackdrop}><Pressable onPress={close} style={StyleSheet.absoluteFill}/><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={[s.composeSheet,{height:'92%',maxHeight:'92%',flex:undefined,paddingBottom:Math.max(insets.bottom,8),elevation:12,shadowColor:'#000',shadowOpacity:.18,shadowRadius:16,shadowOffset:{width:0,height:-4}}]}>
    <View style={s.composeTop}><View style={s.composeTitleGroup}><Icon name="compose" color={c.blue} size={19}/><Text numberOfLines={1} style={s.composeTitle}>{subject.trim()||tr('new_message')}</Text></View><View style={s.composeTopActions}><Pressable onPress={()=>setMinimized(true)} style={s.composeHeaderButton} accessibilityLabel="Minimize message"><Text style={s.minimizeGlyph}>—</Text></Pressable><Pressable onPress={close} style={s.composeHeaderButton} accessibilityLabel="Close compose"><Icon name="close" size={19}/></Pressable></View></View>
    <ScrollView style={s.composeFields} contentContainerStyle={{flexGrow:1}} keyboardShouldPersistTaps="handled">
      {!!error&&<Text style={s.composeError}>{error}</Text>}
      <View style={s.composeFieldRow}><Text style={s.composeFieldLabel}>{tr('to_field')}</Text><TextInput value={to} onChangeText={setTo} onBlur={()=>{const value=to.trim();if(value&&!value.includes('@'))setTo(value.replace(/\D/g,'').slice(-10));}} placeholder={tr('mobile_number')} placeholderTextColor={c.light} keyboardType="phone-pad" autoCapitalize="none" style={s.composeInput}/><View style={s.domainTag}><Text style={s.domainTagText}>@{mailDomain}</Text></View></View>
      <View style={s.composeFieldRow}><Text style={s.composeFieldLabel}>{tr('subject_field')}</Text><TextInput value={subject} onChangeText={setSubject} placeholder={tr('subject_hint')} placeholderTextColor={c.light} style={s.composeInput}/></View>
      <View style={s.aiPromptRow}><TextInput value={aiPrompt} onChangeText={setAiPrompt} onSubmitEditing={()=>void generate()} placeholder={tr('describe_message')} placeholderTextColor={c.light} style={s.aiPromptInput} returnKeyType="go"/><Pressable onPress={()=>void generate()} disabled={generating||sending||!aiPrompt.trim()} accessibilityRole="button" accessibilityLabel="Write with Sarvam AI" style={s.aiButton}><SarvamAIIcon size={20}/></Pressable></View>
      <TextInput value={body} onChangeText={setBody} placeholder={tr('write_email')} placeholderTextColor={c.light} multiline textAlignVertical="top" style={s.composeBody}/>
      {(draft?.attachments?.length||attachments.length)>0?<ScrollView horizontal style={s.fileChips} contentContainerStyle={{gap:7}}>{draft?.attachments?.map((file,index)=><View key={`draft-${index}`} style={s.fileChip}><Icon name="attach" size={13} color={c.blue}/><Text numberOfLines={1} style={s.fileChipText}>{file.filename}</Text></View>)}{attachments.map((file,index)=><Pressable key={`${file.filename}-${index}`} onPress={()=>setAttachments((old)=>old.filter((_,i)=>i!==index))} style={s.fileChip}><Icon name="attach" size={13} color={c.blue}/><Text numberOfLines={1} style={s.fileChipText}>{file.filename}</Text><Icon name="close" size={12} color={c.light}/></Pressable>)}</ScrollView>:null}
    </ScrollView>
    <View style={s.composeToolbarRow}><Pressable style={s.composeToolPill} onPress={()=>void pickFiles()}><Icon name="attach" size={17}/><Text style={s.composeToolText}>{tr('attach_files')}</Text></Pressable>{!draft&&!replyTo?<Pressable style={[s.composeToolPill,showSchedule&&s.composeToolActive]} onPress={()=>setShowSchedule((value)=>!value)}><Icon name="clock" size={17} color={showSchedule?c.blue:c.sub}/><Text style={[s.composeToolText,showSchedule&&{color:c.blue}]}>{scheduledAt?tr('scheduled'):tr('schedule_send')}</Text></Pressable>:null}</View>
    {showSchedule&&!draft&&!replyTo?<View style={s.scheduleRow}><Pressable onPress={()=>setSchedulePickerMode('date')} style={s.scheduleChoice}><Icon name="calendar" size={16}/><Text style={s.scheduleChoiceText}>{scheduledAt?.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})||'Choose date'}</Text></Pressable><Pressable onPress={()=>setSchedulePickerMode('time')} style={s.scheduleChoice}><Icon name="clock" size={16}/><Text style={s.scheduleChoiceText}>{scheduledAt?.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})||'Choose time'}</Text></Pressable>{scheduledAt?<Pressable onPress={()=>setScheduledAt(null)}><Icon name="close" size={16}/></Pressable>:null}</View>:null}
    <View style={s.composeActionRow}><Pressable onPress={close} style={s.composeAction}><Text style={s.composeActionText}>{tr('discard')}</Text></Pressable><Pressable onPress={()=>void saveDraft()} disabled={sending||generating} style={s.composeAction}><Text style={s.composeActionText}>{tr('save_draft')}</Text></Pressable><Icon name="shieldCheck" size={19} color={c.green}/><View style={{flex:1}}/><Pressable onPress={()=>void send()} disabled={sending||generating} style={[s.sendSyscallButton,{minHeight:42,minWidth:130,maxWidth:156,flexShrink:0,paddingHorizontal:10,borderRadius:21,gap:6}]}>{sending||generating?<ActivityIndicator color="#FFFFFF"/>:<><Icon name={scheduledAt?'clock':'send'} size={17} color="#FFFFFF"/><Text numberOfLines={1} style={[s.sendText,{fontSize:12,flexShrink:1}]}>{scheduledAt?tr('schedule_send')+' Syscall':tr('send_syscall')}</Text></>}</Pressable></View>
    {schedulePickerMode&&Platform.OS==='ios'?<Modal transparent visible animationType="slide" onRequestClose={()=>setSchedulePickerMode(null)}><View style={s.dateModalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setSchedulePickerMode(null)}/><View style={[s.dateModal,{paddingBottom:insets.bottom+12}]}><View style={s.dateModalHeader}><Pressable onPress={()=>setSchedulePickerMode('date')}><Text style={s.changeText}>Date</Text></Pressable><Pressable onPress={()=>setSchedulePickerMode('time')}><Text style={s.changeText}>Time</Text></Pressable><Pressable onPress={()=>setSchedulePickerMode(null)}><Text style={s.changeText}>Done</Text></Pressable></View>{picker}</View></View></Modal>:schedulePickerMode&&Platform.OS==='android'?picker:null}
  </KeyboardAvoidingView></View></Modal>;
}

function Profile({visible,user,onClose,onUser,onLogout}:{visible:boolean;user:User;onClose:()=>void;onUser:(u:User)=>void;onLogout:()=>void}) {
  const tr = useTranslate();
  const insets=useSafeAreaInsets(); const [name,setName]=useState(user.name||''); const [gender,setGender]=useState<User['gender']>(user.gender??null); const [dob,setDob]=useState(user.dateOfBirth??''); const [language,setLanguage]=useState(user.language||'en'); const [saving,setSaving]=useState(false); const [savingAvatar,setSavingAvatar]=useState(false); const [message,setMessage]=useState(''); const [genderPicker,setGenderPicker]=useState(false); const [languagePicker,setLanguagePicker]=useState(false); const [languageQuery,setLanguageQuery]=useState(''); const [dobPicker,setDobPicker]=useState(false); const [calendarPage,setCalendarPage]=useState(()=>new Date()); const [calendarMode,setCalendarMode]=useState<'days'|'months'|'years'>('days'); const [copied,setCopied]=useState(false); const [today]=useState(()=>new Date());
  const saveName=async()=>{setSaving(true);setMessage('');try{await api.updateProfile({name:name.trim()});onUser({...user,name:name.trim()});setMessage(tr('name_saved'));}catch(e){setMessage(e instanceof Error?e.message:'Could not save changes.');}finally{setSaving(false);}};
  const savePersonal=async()=>{setSaving(true);setMessage('');try{await api.updateProfile({gender,dateOfBirth:dob||null});onUser({...user,gender,dateOfBirth:dob||null});setMessage(tr('personal_saved'));}catch(e){setMessage(e instanceof Error?e.message:'Could not save details.');}finally{setSaving(false);}};
  const saveLanguage=async()=>{setSaving(true);setMessage('');try{await api.updateProfile({language});onUser({...user,language});setMessage(translate('language_saved',language));}catch(e){setMessage(e instanceof Error?e.message:'Could not save language.');}finally{setSaving(false);}};
  const changeAvatar=async()=>{
    if(savingAvatar)return;
    setSavingAvatar(true);
    try{
      const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
      const asset=picked.assets?.[0];
      if(picked.canceled||!asset?.uri)return;

      setMessage('');
      // The API stores JPEGs up to 256 KB. Retry at smaller sizes/quality so
      // large camera photos are accepted without requiring picker base64. Crop
      // the center square here instead of relying on OEM-specific crop screens.
      const side=Math.min(asset.width,asset.height);
      const crop={crop:{originX:Math.round((asset.width-side)/2),originY:Math.round((asset.height-side)/2),width:side,height:side}};
      let avatarBase64:string|undefined;
      for(const [width,compress] of [[320,.72],[256,.62],[192,.5],[128,.4]] as const){
        const resized=await ImageManipulator.manipulateAsync(asset.uri,[crop,{resize:{width}}],{compress,format:ImageManipulator.SaveFormat.JPEG,base64:true});
        if(!resized.base64)continue;
        if(resized.base64.length*0.75<=250*1024){avatarBase64=resized.base64;break;}
      }
      if(!avatarBase64)throw new Error('This photo could not be reduced enough. Please choose another image.');
      const saved=await api.updateProfile({avatarBase64});
      if(!saved.avatarAvailable)throw new Error('The server did not save the profile photo. Please try again.');
      onUser({...user,avatarUrl:`data:image/jpeg;base64,${avatarBase64}`});
      setMessage('Profile photo updated successfully!');
    }catch(e){Alert.alert('Could not update photo',e instanceof Error?e.message:'Try again.');}
    finally{setSavingAvatar(false);}
  };
  const cleanPhone=user.phone.replace(/\D/g,'').slice(-10);let carrier:string|null=null;const carrierDigits=`91${cleanPhone}`;for(let len=7;len>=3;len--){if(indiaCarriers[carrierDigits.slice(0,len)]){carrier=indiaCarriers[carrierDigits.slice(0,len)];break;}}const brand=carrier?.toLowerCase().includes('jio')?'jio':carrier?.toLowerCase().includes('airtel')||carrier?.toLowerCase().includes('docomo')||carrier?.toLowerCase().includes('telenor')?'airtel':carrier?.toLowerCase().includes('vodafone')||carrier?.toLowerCase().includes('idea')?'vi':carrier?.toLowerCase().includes('bsnl')||carrier?.toLowerCase().includes('mtnl')?'bsnl':null;const carrierLogo=brand==='airtel'?require('../../assets/carriers/airtel.png'):brand==='jio'?require('../../assets/carriers/jio.png'):brand==='vi'?require('../../assets/carriers/vi.png'):brand==='bsnl'?require('../../assets/carriers/bsnl.png'):null;const carrierLabel=brand==='vi'?'Vi':brand==='jio'?'Jio':carrier;
  const languageOptions=[['en','English','English (India)','IN'],['hi','Hindi','Hindi','IN'],['bn','Bengali','Bengali','IN'],['te','Telugu','Telugu','IN'],['mr','Marathi','Marathi','IN'],['ta','Tamil','Tamil','IN'],['gu','Gujarati','Gujarati','IN'],['kn','Kannada','Kannada','IN'],['ml','Malayalam','Malayalam','IN'],['pa','Punjabi','Punjabi','IN'],['es','Spanish','Español','ES'],['fr','French','Français','FR'],['de','German','Deutsch','DE']];const selectedLanguage=languageOptions.find(([code])=>code===language)||languageOptions[0];const age=dob?ageAt(dob,today):null;const formattedDob=dob?parseLocalDate(dob).toLocaleDateString('en-US',{day:'numeric',month:'long',year:'numeric'}):'';
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];const pageYear=calendarPage.getFullYear();const pageMonth=calendarPage.getMonth();const firstWeekday=new Date(pageYear,pageMonth,1).getDay();const daysInMonth=new Date(pageYear,pageMonth+1,0).getDate();const yearOptions=Array.from({length:Math.max(1,today.getFullYear()-1900+1)},(_,index)=>today.getFullYear()-index);const openDobPicker=()=>{setCalendarPage(dob?parseLocalDate(dob):new Date(today.getFullYear(),today.getMonth(),1,12));setCalendarMode('days');setDobPicker(true);};const shiftCalendar=(delta:number)=>setCalendarPage((current)=>new Date(current.getFullYear(),current.getMonth()+delta,1,12));const chooseDob=(day:number)=>{const value=localDateValue(new Date(pageYear,pageMonth,day,12));if(value<=localDateValue(today)){setDob(value);setDobPicker(false);}};
  const copyAddress=async()=>{await Clipboard.setStringAsync(user.emailAddress);setCopied(true);setTimeout(()=>setCopied(false),1800);};
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={[s.profilePage,{paddingTop:insets.top,paddingBottom:insets.bottom+12}]}><View style={s.profileTop}><Pressable onPress={onClose} style={s.profileBack}><Icon name="back" size={18} color={c.blue}/><Text style={s.profileBackText}>{tr('back_to_mail')}</Text></Pressable><View style={{flex:1}}/></View><ScrollView contentContainerStyle={s.profileContent}>
    <View style={s.profileHero}><Pressable onPress={()=>void changeAvatar()} disabled={savingAvatar} style={s.profileAvatarWrap}>{user.avatarUrl?<Image source={{uri:user.avatarUrl}} style={s.profileAvatar}/>:<View style={s.profileAvatarFallback}><Text style={s.profileInitials}>{initials(user.name)}</Text></View>}<View style={s.cameraBubble}>{savingAvatar?<ActivityIndicator size="small" color="#FFFFFF"/>:<Icon name="camera" size={14} color="#FFFFFF"/>}</View></Pressable><Pressable onPress={()=>void changeAvatar()} disabled={savingAvatar} accessibilityRole="button"><Text style={[s.changePhoto,savingAvatar&&{opacity:.55}]}>{savingAvatar?'Updating photo…':tr('change_photo')}</Text></Pressable><DisplayText style={s.profileName}>{user.name||tr('profile_title')}</DisplayText><Text style={s.profileEmail}>{tr('profile_subtitle')}</Text></View>
    {!!message&&<Text style={s.message}>{message}</Text>}
    <View style={s.profileCard}><Text style={s.cardHeading}>{tr('display_name')}</Text><View style={s.nameRow}><TextInput value={name} onChangeText={setName} placeholder={tr('name_placeholder')} placeholderTextColor={c.light} style={[s.profileInput,{flex:1}]}/><Pressable onPress={()=>void saveName()} disabled={saving} style={s.nameSave}>{saving?<ActivityIndicator color="#FFFFFF"/>:<Text style={s.saveButtonText}>{tr('save_name')}</Text>}</Pressable></View></View>
    <View style={s.profileCard}><Text style={s.cardHeading}>{tr('personal_details')}</Text><Text style={s.cardDescription}>{tr('personal_desc')}</Text><Text style={s.fieldLabel}>{tr('gender_label')}</Text><Pressable onPress={()=>setGenderPicker(true)} style={s.profileSelect}><Text style={[s.languageValue,{color:gender?c.text:c.light}]}>{gender?tr(`gender_${gender}`):tr('select_gender')}</Text><Icon name="chevron" size={16}/></Pressable><View style={s.innerDivider}/><View style={s.dobHeader}><Text style={s.dobSectionLabel}>{tr('choose_dob')}</Text>{age!==null&&<Text style={s.ageBadge}>{tr('age_label')}: {age} {tr(age===1?'age_year_old':'age_years_old')}</Text>}</View><Pressable onPress={openDobPicker} style={s.dobBar}><View style={s.dobIcon}><Icon name="calendar" size={18}/></View><View style={{flex:1}}><Text style={s.dobBarTitle}>{tr('choose_dob').toUpperCase()}</Text><Text style={[s.dobBarCaption,dob&&s.dobBarCaptionSelected]}>{formattedDob||`${tr('choose_dob')}...`}</Text></View>{dob?<Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('clear')} onPress={(e)=>{e.stopPropagation();setDob('');}} style={s.dobClearButton}><Icon name="close" size={15}/><Text style={s.dobClearText}>{tr('clear')}</Text></Pressable>:null}</Pressable><View style={s.cardFooter}><View style={{flex:1}}/><Pressable onPress={()=>void savePersonal()} disabled={saving} style={s.nameSave}>{saving?<ActivityIndicator color="#FFFFFF"/>:<Text style={s.saveButtonText}>{tr('save_personal')}</Text>}</Pressable></View></View>
    <View style={s.profileCard}><View style={s.profileCardHeadingRow}><Icon name="language" size={20} color={c.text}/><Text style={[s.cardHeading,{marginBottom:0}]}>{translate('language_settings',language)}</Text></View><Text style={[s.cardDescription,{marginTop:8}]}>{translate('language_hint',language)}</Text><Pressable onPress={()=>{setLanguagePicker(true);setLanguageQuery('');}} style={s.profileSelect}><View style={s.langSelected}><Text style={s.regionBadge}>{selectedLanguage[3]}</Text><Text numberOfLines={1} style={s.languageValue}>{selectedLanguage[1]} — {selectedLanguage[2]}</Text></View><Icon name="chevron" size={16}/></Pressable><Text style={s.languageHint}>{translate('language_choose_hint',language)}</Text><View style={s.cardFooter}><View style={{flex:1}}/><Pressable onPress={()=>void saveLanguage()} disabled={saving} style={s.nameSave}>{saving?<ActivityIndicator color="#FFFFFF"/>:<Text style={s.saveButtonText}>{translate('save_language',language)}</Text>}</Pressable></View></View>
    <View style={s.profileCard}><Text style={s.cardHeading}>{tr('syscall_address')}</Text><View style={s.addressBox}><View style={{flex:1,flexDirection:'row',alignItems:'center',gap:7}}><Text numberOfLines={2} style={s.addressText}>{user.emailAddress}</Text><Icon name="shieldCheck" size={18} color={c.green}/></View><Pressable onPress={()=>void copyAddress()} style={s.copyButton}><Text style={s.copyAddressText}>{copied?tr('copied'):tr('copy_address')}</Text></Pressable></View><Text style={s.languageHint}>Official Indian Syscall format tied to your mobile number +91 {cleanPhone}.</Text></View>
    <View style={s.profileCard}><Text style={s.cardHeading}>{tr('carrier_number')}</Text><View style={s.carrierRow}><Text style={s.carrierNumber}>{cleanPhone.length===10?`+91 ${cleanPhone.slice(0,5)} ${cleanPhone.slice(5)}`:`+91 ${user.phone}`}</Text>{carrierLabel?<View style={s.carrierBadge}>{carrierLogo&&<Image source={carrierLogo} style={s.carrierLogo}/>}<Text style={s.carrierText}>{carrierLabel}</Text><Pressable onPress={()=>Alert.alert('Carrier information','It can only show original carrier and may show wrong carrier for ported SIMs.')} hitSlop={8} accessibilityRole="button" accessibilityLabel="About carrier information"><Icon name="info" size={15} color={c.blue}/></Pressable></View>:null}</View></View>
    <Pressable onPress={onLogout} accessibilityRole="button" style={s.signOutButton}><Text style={s.signOutText}>{tr('sign_out')}</Text></Pressable>
  </ScrollView>
  <Modal visible={genderPicker} transparent animationType="fade" onRequestClose={()=>setGenderPicker(false)}><View style={s.pickerBackdrop}><Pressable onPress={()=>setGenderPicker(false)} style={StyleSheet.absoluteFill}/><View style={s.pickerCard}><Text style={s.pickerTitle}>{tr('select_gender')}</Text>{([['male','Male'],['female','Female'],['other','Other'],['prefer_not_to_say','Prefer not to say']] as const).map(([value])=><Pressable key={value} onPress={()=>{setGender(value);setGenderPicker(false);}} style={s.pickerItem}><Text style={s.languageValue}>{tr(`gender_${value}`)}</Text>{gender===value?<Icon name="check" size={16} color={c.blue}/>:null}</Pressable>)}</View></View></Modal>
  <Modal visible={languagePicker} transparent animationType="fade" onRequestClose={()=>setLanguagePicker(false)}><View style={s.pickerBackdrop}><Pressable onPress={()=>setLanguagePicker(false)} style={StyleSheet.absoluteFill}/><View style={[s.pickerCard,{maxHeight:'72%'}]}><Text style={s.pickerTitle}>{translate('language_settings',language)}</Text><TextInput value={languageQuery} onChangeText={setLanguageQuery} placeholder={translate('search_languages',language)} placeholderTextColor={c.light} style={s.filterInput}/><ScrollView>{languageOptions.filter((x)=>`${x[1]} ${x[2]}`.toLowerCase().includes(languageQuery.toLowerCase())).map(([code,title,native,region])=><Pressable key={code} onPress={()=>{setLanguage(code);setLanguagePicker(false);}} style={s.pickerItem}><View style={s.langSelected}><Text style={s.regionBadge}>{region}</Text><View><Text style={s.languageValue}>{title}</Text><Text style={s.languageHint}>{native}</Text></View></View>{language===code?<Icon name="check" size={16} color={c.blue}/>:null}</Pressable>)}</ScrollView></View></View></Modal>
  <Modal visible={dobPicker} transparent animationType="fade" onRequestClose={()=>setDobPicker(false)}><View style={dobStyles.dobPickerBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setDobPicker(false)}/><View style={dobStyles.dobCalendarCard}><View style={dobStyles.dobCalendarTop}><Text style={dobStyles.dobCalendarTitle}>Choose date of birth</Text><Pressable onPress={()=>setDobPicker(false)} hitSlop={8}><Icon name="close" size={20}/></Pressable></View><View style={dobStyles.dobCalendarNav}>{calendarMode==='days'?<><Pressable onPress={()=>shiftCalendar(-1)} style={dobStyles.calendarArrow}><Text style={dobStyles.calendarArrowText}>‹</Text></Pressable><Pressable onPress={()=>setCalendarMode('months')} style={dobStyles.calendarNavLabel}><Text style={dobStyles.calendarNavText}>{monthNames[pageMonth]}</Text><Icon name="chevron" size={14}/></Pressable><Pressable onPress={()=>setCalendarMode('years')} style={dobStyles.calendarNavLabel}><Text style={dobStyles.calendarNavText}>{pageYear}</Text><Icon name="chevron" size={14}/></Pressable><Pressable disabled={pageYear===today.getFullYear()&&pageMonth>=today.getMonth()} onPress={()=>shiftCalendar(1)} style={[dobStyles.calendarArrow,pageYear===today.getFullYear()&&pageMonth>=today.getMonth()&&{opacity:.3}]}><Text style={dobStyles.calendarArrowText}>›</Text></Pressable></>:<><Pressable onPress={()=>setCalendarMode('days')} style={dobStyles.calendarBack}><Icon name="back" size={16}/></Pressable><Text style={dobStyles.calendarNavText}>{calendarMode==='months'?'Choose month':'Choose year'}</Text><View style={{flex:1}}/></>}</View>{calendarMode==='days'?<><View style={dobStyles.weekdayRow}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day)=><View key={day} style={dobStyles.calendarCell}><Text style={dobStyles.weekdayText}>{day}</Text></View>)}</View><View style={dobStyles.calendarGrid}>{Array.from({length:42},(_,index)=>{const day=index-firstWeekday+1;const valid=day>0&&day<=daysInMonth;const dateValue=valid?localDateValue(new Date(pageYear,pageMonth,day,12)):'';const disabled=!valid||dateValue>localDateValue(today);const active=dateValue===dob;return <Pressable key={index} disabled={disabled} onPress={()=>chooseDob(day)} style={dobStyles.calendarCell}>{valid?<View style={[dobStyles.calendarDay,active&&dobStyles.calendarDayActive,disabled&&dobStyles.calendarDayDisabled]}><Text style={[dobStyles.calendarDayText,active&&dobStyles.calendarDayTextActive,disabled&&dobStyles.calendarDayTextDisabled]}>{day}</Text></View>:null}</Pressable>;})}</View></>:calendarMode==='months'?<View style={dobStyles.monthGrid}>{monthNames.map((month,index)=><Pressable key={month} onPress={()=>{setCalendarPage(new Date(pageYear,index,1,12));setCalendarMode('days');}} style={[dobStyles.monthOption,index===pageMonth&&dobStyles.monthOptionActive]}><Text style={[dobStyles.monthOptionText,index===pageMonth&&dobStyles.monthOptionTextActive]}>{month.slice(0,3)}</Text></Pressable>)}</View>:<ScrollView style={dobStyles.yearList} contentContainerStyle={dobStyles.yearListContent}>{yearOptions.map((year)=><Pressable key={year} onPress={()=>{setCalendarPage(new Date(year,pageMonth,1,12));setCalendarMode('days');}} style={[dobStyles.yearOption,year===pageYear&&dobStyles.monthOptionActive]}><Text style={[dobStyles.monthOptionText,year===pageYear&&dobStyles.monthOptionTextActive]}>{year}</Text></Pressable>)}</ScrollView>}<View style={dobStyles.dobCalendarFooter}><Pressable onPress={()=>setDobPicker(false)} style={dobStyles.calendarFooterButton}><Text style={dobStyles.calendarFooterText}>Cancel</Text></Pressable><View style={{flex:1}}/><Pressable onPress={()=>{setDob('');setDobPicker(false);}} style={dobStyles.calendarFooterButton}><Text style={dobStyles.calendarFooterText}>Clear date</Text></Pressable></View></View></View></Modal>
  </View></Modal>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:c.bg},loading:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:c.bg},
  header:{height:56,width:'100%',minWidth:0,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10},searchPill:{height:44,flex:1,minWidth:0,borderRadius:22,backgroundColor:c.search,flexDirection:'row',alignItems:'center',paddingHorizontal:6,overflow:'hidden',shadowColor:'#3C4043',shadowOpacity:.12,shadowRadius:3,shadowOffset:{width:0,height:1},elevation:1},menuButton:{width:32,flexShrink:0,alignItems:'center',justifyContent:'center'},searchInput:{flex:1,minWidth:0,height:'100%',fontFamily:'Inter_500Medium',fontSize:15,color:c.text,textAlign:'center',paddingHorizontal:3},filterButton:{width:32,flexShrink:0,alignItems:'center',justifyContent:'center'},filterActive:{backgroundColor:'#E8F0FE',borderRadius:16},clearSearch:{width:26,flexShrink:0,alignItems:'center',justifyContent:'center'},avatar:{height:40,width:40,flexShrink:0,borderRadius:20,backgroundColor:c.blue,alignItems:'center',justifyContent:'center',overflow:'hidden'},avatarImage:{width:40,height:40},avatarText:{color:'#FFFFFF',fontSize:13,fontWeight:'700'},iconButton:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},selectionBar:{flex:1,flexDirection:'row',alignItems:'center',gap:4,minWidth:0},selectedCount:{fontSize:14,fontWeight:'500',flex:1,color:c.text},
  tabsBar:{height:52,width:'100%',flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:1,borderColor:c.divider,backgroundColor:'#FFFFFF',overflow:'hidden'},tabsMore:{width:40,height:44,alignItems:'center',justifyContent:'center',flexShrink:0},moreGlyph:{fontSize:27,lineHeight:32,color:'#444746',fontWeight:'600',textAlign:'center'},tabsDivider:{height:30,width:1,backgroundColor:c.divider,marginHorizontal:8,flexShrink:0},tabsWrap:{flexGrow:1,flexShrink:1,flexBasis:0,minWidth:0,maxHeight:50,overflow:'hidden'},tabs:{alignItems:'center',gap:6,paddingHorizontal:2,paddingVertical:7},tab:{height:36,paddingHorizontal:10,borderRadius:8,flexDirection:'row',alignItems:'center',gap:6,flexShrink:0},activeTab:{backgroundColor:c.selected},tabText:{fontSize:13.5,fontWeight:'500',color:c.sub},activeTabText:{color:'#041E49',fontWeight:'600'},tabsRefresh:{position:'absolute',right:8,top:4,width:42,height:44,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFFFF',zIndex:1},menuOverlay:{flex:1},inboxMenu:{position:'absolute',left:8,width:220,paddingVertical:5,backgroundColor:'#FFFFFF',borderRadius:10,elevation:8,shadowColor:'#000',shadowOpacity:.18,shadowRadius:12,shadowOffset:{width:0,height:3}},inboxMenuItem:{minHeight:44,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:12},inboxMenuText:{fontSize:13,color:c.text},folderTitle:{height:52,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:c.divider},folderTitleText:{fontSize:18,fontWeight:'600',color:c.text},errorBanner:{margin:12,padding:11,borderRadius:10,backgroundColor:'#FCE8E6'},errorText:{color:'#B3261E',fontSize:12},
  row:{height:48,width:'100%',minWidth:0,paddingHorizontal:7,flexDirection:'row',alignItems:'center',gap:5,borderBottomWidth:1,borderBottomColor:c.divider,overflow:'hidden'},star:{width:20,height:32,flexShrink:0,alignItems:'center',justifyContent:'center'},senderAvatar:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center',flexShrink:0},senderAvatarText:{fontSize:12,fontWeight:'500',color:'#35363A'},senderColumn:{flex:0.9,minWidth:0,overflow:'hidden'},senderName:{fontSize:13.5,color:c.text},snippetColumn:{flex:1,minWidth:0,overflow:'hidden'},subject:{fontSize:13.5},snippet:{fontSize:13,color:c.light,fontWeight:'400'},rowRight:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:5,flexShrink:0},date:{fontSize:11,color:c.light,minWidth:52,textAlign:'right'},attachBadge:{height:16,minWidth:24,paddingHorizontal:4,borderRadius:8,backgroundColor:'#DCFCE7',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:1},attachCount:{fontSize:9,fontWeight:'600',color:c.green},empty:{flex:1,alignItems:'center',justifyContent:'center',paddingBottom:50,gap:16},emptyIcon:{width:64,height:64,borderRadius:32,backgroundColor:'#EEF1F5',alignItems:'center',justifyContent:'center'},emptyText:{fontSize:14,color:c.light},fab:{position:'absolute',right:16,height:48,paddingHorizontal:20,borderRadius:16,backgroundColor:c.compose,flexDirection:'row',alignItems:'center',gap:10,elevation:4,shadowColor:'#000',shadowOpacity:.15,shadowRadius:7,shadowOffset:{width:0,height:3}},fabText:{fontSize:14,fontWeight:'600',color:c.composeText},
  filterBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.38)'},filterPanel:{flex:1},filterCard:{flex:1,maxHeight:'100%',backgroundColor:'#FFFFFF',borderBottomLeftRadius:20,borderBottomRightRadius:20,overflow:'hidden',shadowColor:'#000',shadowOpacity:.2,shadowRadius:18,elevation:8},filterHeader:{height:48,paddingLeft:16,paddingRight:6,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.divider},filterTitle:{fontSize:14,fontWeight:'600',flex:1},filterBody:{padding:14,paddingBottom:8},filterLabel:{fontSize:11,fontWeight:'600',color:c.sub,marginBottom:6,marginTop:8},filterInput:{height:40,paddingHorizontal:13,borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:'#FFFFFF',fontSize:13,color:c.text,fontFamily:'Inter_400Regular',marginBottom:7},filterSwitchRow:{minHeight:42,borderBottomWidth:1,borderColor:c.divider,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},filterSwitchLabel:{fontSize:13,color:c.text},dateChoices:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:3},dateChip:{paddingHorizontal:11,height:32,borderWidth:1,borderColor:c.border,borderRadius:16,justifyContent:'center'},dateChipActive:{backgroundColor:c.selected,borderColor:'#A8C7FA'},dateChipText:{fontSize:11,color:c.sub},dateChipTextActive:{fontWeight:'600',color:'#041E49'},filterFooter:{height:58,paddingHorizontal:14,borderTopWidth:1,borderColor:c.divider,flexDirection:'row',alignItems:'center'},filterReset:{paddingHorizontal:10,paddingVertical:9},filterResetText:{fontSize:13,fontWeight:'600',color:c.blue},filterApply:{height:38,paddingHorizontal:16,borderRadius:20,backgroundColor:c.blue,alignItems:'center',justifyContent:'center'},filterApplyText:{fontSize:12,fontWeight:'600',color:'#FFFFFF'},
  modalScrim:{flex:1,backgroundColor:'rgba(0,0,0,.32)',flexDirection:'row'},drawer:{width:'83%',maxWidth:330,backgroundColor:'#F8FAFD',borderTopRightRadius:18,borderBottomRightRadius:18,paddingHorizontal:12},drawerBrand:{height:56,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,marginBottom:8},smallLogo:{width:34,height:34,borderRadius:11,backgroundColor:c.blue,alignItems:'center',justifyContent:'center'},drawerBrandName:{fontSize:22},folderItem:{height:48,borderRadius:24,paddingHorizontal:15,flexDirection:'row',alignItems:'center',gap:16,marginBottom:3},folderActive:{backgroundColor:'#D3E3FD'},folderLabel:{fontSize:14,color:c.sub},folderLabelActive:{fontWeight:'600',color:'#041E49'},drawerAccount:{minHeight:66,borderTopWidth:1,borderColor:c.border,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8,marginTop:10},drawerAvatar:{height:38,width:38,borderRadius:19,alignItems:'center',justifyContent:'center'},accountName:{fontSize:12,fontWeight:'600'},accountEmail:{fontSize:11,color:c.light,marginTop:3},
  reader:{flex:1,backgroundColor:'#FFFFFF'},readerToolbar:{height:52,paddingHorizontal:8,flexDirection:'row',alignItems:'center'},readerScroll:{flex:1},readerContent:{paddingHorizontal:18,paddingTop:14,paddingBottom:28},readerSubject:{fontSize:22,lineHeight:29,marginBottom:22},senderDetails:{flexDirection:'row',alignItems:'center',gap:10},readerAvatar:{width:38,height:38,borderRadius:19},senderHeadline:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},readerSender:{fontSize:14,fontWeight:'600',flexShrink:1},readerDate:{fontSize:11,color:c.light},readerAddress:{fontSize:11,color:c.light,marginTop:3},bodyText:{fontSize:15,color:c.text,lineHeight:25,marginTop:26,minHeight:120},attachments:{gap:8,marginTop:20},attachment:{height:58,borderWidth:1,borderColor:c.border,borderRadius:10,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12},attachmentName:{fontSize:12,fontWeight:'500'},attachmentSize:{fontSize:10,color:c.light,marginTop:4},replyButtons:{flexDirection:'row',gap:10,marginTop:28},replyButton:{height:40,borderRadius:22,borderWidth:1,borderColor:'#747775',paddingHorizontal:17,flexDirection:'row',alignItems:'center',gap:8},replyText:{fontSize:13,fontWeight:'500',color:c.sub},
  composeBackdrop:{flex:1,backgroundColor:'rgba(32,33,36,.32)',justifyContent:'flex-end'},composeSheet:{height:'94%',backgroundColor:'#FFFFFF',borderTopLeftRadius:20,borderTopRightRadius:20,overflow:'hidden'},composeTop:{height:56,backgroundColor:'#F2F6FC',flexDirection:'row',alignItems:'center',paddingHorizontal:12,borderBottomWidth:1,borderColor:c.divider},composeTitleGroup:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:10},composeTopActions:{flexDirection:'row',alignItems:'center'},composeTitle:{fontSize:15,fontWeight:'600',marginLeft:0,flexShrink:1},composeHeaderButton:{width:38,height:40,alignItems:'center',justifyContent:'center'},minimizeGlyph:{fontSize:25,lineHeight:30,color:c.sub,fontWeight:'500'},composeFields:{flex:1,minHeight:0,paddingHorizontal:16,paddingTop:4},composeError:{color:'#B3261E',fontSize:12,paddingVertical:6},composeFieldRow:{minHeight:46,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.divider,gap:8},composeFieldLabel:{width:62,fontSize:13,fontWeight:'600',color:c.sub},composeInput:{flex:1,minWidth:0,minHeight:44,paddingVertical:7,borderBottomWidth:0,fontSize:14,color:c.text,fontFamily:'Inter_400Regular'},domainTag:{paddingHorizontal:10,paddingVertical:6,borderRadius:8,backgroundColor:'#EAF1FB'},domainTagText:{fontSize:13,fontWeight:'600',color:c.blue},aiPromptRow:{minHeight:50,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:c.divider},aiPromptInput:{flex:1,minWidth:0,height:48,fontSize:14,color:c.text,fontFamily:'Inter_400Regular'},aiButton:{width:42,height:42,alignItems:'center',justifyContent:'center'},composeBody:{flex:1,minHeight:110,marginTop:12,padding:13,borderWidth:1,borderColor:'#DADCE0',borderRadius:14,fontSize:15,lineHeight:23,color:c.text,fontFamily:'Inter_400Regular'},fileChips:{maxHeight:42,marginTop:8},fileChip:{height:30,maxWidth:220,paddingHorizontal:9,borderRadius:16,backgroundColor:c.search,borderWidth:1,borderColor:c.compose,flexDirection:'row',alignItems:'center',gap:6},fileChipText:{fontSize:11,color:'#041E49',maxWidth:160},composeToolbarRow:{minHeight:54,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:9,borderTopWidth:1,borderColor:c.divider},composeToolPill:{height:38,paddingHorizontal:13,borderRadius:20,borderWidth:1,borderColor:c.border,flexDirection:'row',alignItems:'center',gap:7},composeToolActive:{backgroundColor:'#EAF1FB',borderColor:'#A8C7FA'},composeToolText:{fontSize:12,color:c.sub},scheduleRow:{minHeight:48,paddingHorizontal:16,flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderColor:c.divider},scheduleChoice:{height:34,paddingHorizontal:10,borderRadius:10,backgroundColor:c.search,flexDirection:'row',alignItems:'center',gap:7},scheduleChoiceText:{fontSize:12,color:c.text},composeActionRow:{minHeight:72,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:5,borderTopWidth:1,borderColor:c.divider},composeAction:{minHeight:45,paddingHorizontal:7,alignItems:'center',justifyContent:'center'},composeActionText:{fontSize:12.5,fontWeight:'500',color:c.sub},sendSyscallButton:{minHeight:48,maxWidth:160,paddingHorizontal:14,borderRadius:24,backgroundColor:c.blue,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,elevation:2},sendButton:{height:38,paddingHorizontal:16,borderRadius:22,backgroundColor:c.blue,flexDirection:'row',alignItems:'center',gap:7},sendText:{fontSize:13,fontWeight:'600',color:'#FFFFFF'},minimizedComposeWrap:{flex:1,justifyContent:'flex-end',alignItems:'flex-end',padding:14},minimizedCompose:{height:50,maxWidth:280,minWidth:200,paddingHorizontal:14,borderRadius:16,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',gap:10,elevation:7},minimizedComposeText:{flex:1,fontSize:13,fontWeight:'600',color:c.text},
  profilePage:{flex:1,backgroundColor:'#F8FAFD'},profileTop:{height:50,flexDirection:'row',alignItems:'center',paddingHorizontal:8},profileBack:{height:40,paddingHorizontal:14,borderRadius:22,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',gap:8,elevation:2},profileBackText:{fontSize:13.5,fontWeight:'500',color:c.blue},profileContent:{paddingHorizontal:14,paddingBottom:24},profileHero:{alignItems:'center',paddingTop:8,paddingBottom:18},profileAvatarWrap:{position:'relative',marginBottom:6},profileAvatar:{width:88,height:88,borderRadius:44},profileAvatarFallback:{width:88,height:88,borderRadius:44,backgroundColor:c.blue,alignItems:'center',justifyContent:'center'},profileInitials:{fontSize:26,fontWeight:'600',color:'#FFFFFF'},cameraBubble:{position:'absolute',right:2,bottom:2,width:26,height:26,borderRadius:13,backgroundColor:'#1F1F1F',borderWidth:2,borderColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},changePhoto:{fontSize:13,color:c.blue,fontWeight:'600',textDecorationLine:'underline',marginTop:4,marginBottom:8},profileName:{fontSize:24,fontWeight:'700',marginTop:3},profileEmail:{fontSize:13.5,color:c.sub,marginTop:5,textAlign:'center'},profileCardHeadingRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},profileCard:{backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#EDF0F5',borderRadius:16,padding:16,marginBottom:12},cardHeading:{fontSize:11.5,fontWeight:'700',color:'#444746',marginBottom:12,textTransform:'uppercase',letterSpacing:.5},cardDescription:{fontSize:12.5,lineHeight:18,color:c.sub,marginTop:-7,marginBottom:14},fieldLabel:{fontSize:13,fontWeight:'600',color:c.text,marginBottom:7},profileInput:{height:42,borderRadius:14,backgroundColor:'#F0F4F9',paddingHorizontal:14,fontSize:14,color:c.text,fontFamily:'Inter_500Medium'},readOnly:{color:c.light},nameRow:{flexDirection:'row',alignItems:'center',gap:10},nameSave:{minHeight:40,paddingHorizontal:15,borderRadius:12,backgroundColor:c.blue,alignItems:'center',justifyContent:'center'},saveButton:{height:42,borderRadius:22,backgroundColor:c.blue,alignItems:'center',justifyContent:'center',marginTop:14},saveButtonText:{fontSize:12,fontWeight:'600',color:'#FFFFFF'},profileSelect:{height:40,width:'100%',borderRadius:12,backgroundColor:'#F0F4F9',paddingHorizontal:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},innerDivider:{height:1,backgroundColor:c.divider,marginVertical:15},dobHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',columnGap:8,rowGap:6,marginBottom:8},ageBadge:{fontSize:11.5,fontWeight:'600',color:'#137333',backgroundColor:'#E6F4EA',paddingHorizontal:10,paddingVertical:5,borderRadius:14,flexShrink:0},dobSectionLabel:{fontSize:13,fontWeight:'600',color:c.text,marginBottom:0,flexShrink:1},dobBar:{minHeight:60,paddingHorizontal:12,paddingVertical:8,borderRadius:16,backgroundColor:'#F0F4F9',flexDirection:'row',alignItems:'center',gap:11},dobIcon:{height:32,width:32,borderRadius:10,backgroundColor:'#E2E7EF',alignItems:'center',justifyContent:'center'},dobBarTitle:{fontSize:11,fontWeight:'600',letterSpacing:.4,color:'#444746',textTransform:'uppercase'},dobBarCaption:{fontSize:13,color:c.light,marginTop:3},dobBarCaptionSelected:{color:c.text,fontWeight:'600'},dobClearButton:{height:28,paddingHorizontal:10,borderRadius:12,backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4,elevation:1},dobClearText:{fontSize:11.5,fontWeight:'600',color:c.sub},cardFooter:{flexDirection:'row',alignItems:'center',marginTop:12},languageRow:{height:44,borderRadius:12,backgroundColor:'#F0F4F9',paddingHorizontal:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},languageValue:{fontSize:13,color:c.text},languageChange:{flexDirection:'row',alignItems:'center',gap:4},langSelected:{flexDirection:'row',alignItems:'center',gap:9,flexShrink:1},regionBadge:{paddingHorizontal:6,paddingVertical:3,borderRadius:6,backgroundColor:'#E2E7EF',color:c.text,fontSize:10,fontWeight:'700',overflow:'hidden'},changeText:{fontSize:12,fontWeight:'600',color:c.blue},copyAddressText:{fontSize:12,fontWeight:'600',color:'#1F1F1F'},languageHint:{fontSize:10.5,color:c.light,marginTop:6},message:{fontSize:12,marginTop:8,marginHorizontal:14,color:c.green},addressBox:{minHeight:50,alignItems:'stretch',flexDirection:'column',gap:10,padding:12,borderRadius:14,backgroundColor:'#F0F4F9'},addressHeadingRow:{minHeight:24,flexDirection:'row',alignItems:'center',gap:7},addressText:{fontSize:14.5,fontWeight:'600',fontFamily:'monospace',color:c.blue,flexShrink:1},copyButton:{height:34,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderRadius:12,backgroundColor:'#FFFFFF'},carrierRow:{minHeight:42,flexDirection:'row',alignItems:'center',justifyContent:'flex-start',gap:12,paddingTop:2},carrierNumber:{fontSize:15,fontWeight:'700',fontFamily:'monospace',color:c.text},carrierBadge:{minHeight:32,flexDirection:'row',alignItems:'center',gap:7,paddingLeft:6,paddingRight:12,borderRadius:20,backgroundColor:'#E8F0FE'},carrierLogo:{width:20,height:20,borderRadius:10,resizeMode:'contain',backgroundColor:'#FFFFFF',padding:1},carrierText:{fontSize:12.5,fontWeight:'600',color:'#041E49'},signOutButton:{alignSelf:'flex-start',paddingVertical:10,paddingHorizontal:22,marginTop:5,marginBottom:20,borderRadius:12,backgroundColor:'#FCE8E6'},signOutText:{fontSize:13,fontWeight:'600',color:'#C5221F'},pickerBackdrop:{flex:1,backgroundColor:'rgba(32,33,36,.32)',alignItems:'center',justifyContent:'center',padding:16},pickerCard:{width:'100%',maxWidth:400,maxHeight:'65%',padding:8,borderRadius:16,backgroundColor:'#FFFFFF',shadowColor:'#000',shadowOpacity:.18,shadowRadius:18,elevation:9},pickerTitle:{fontSize:15,fontWeight:'600',paddingHorizontal:12,paddingVertical:12},pickerItem:{minHeight:46,paddingHorizontal:12,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},dateModalBackdrop:{flex:1,backgroundColor:'rgba(32,33,36,.32)',justifyContent:'flex-end'},dateModal:{backgroundColor:'#FFFFFF',borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:16},dateModalHeader:{height:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},accountInfo:{minHeight:58,flexDirection:'row',alignItems:'center',gap:13},accountInfoTitle:{fontSize:12,fontWeight:'500'},accountInfoSub:{fontSize:11,color:c.light,marginTop:3},
});

const dobStyles = StyleSheet.create({
  dobPickerBackdrop:{flex:1,backgroundColor:'rgba(32,33,36,.35)',alignItems:'center',justifyContent:'center',padding:16},dobCalendarCard:{width:'100%',maxWidth:360,backgroundColor:'#FFFFFF',borderRadius:16,paddingHorizontal:14,paddingTop:8,paddingBottom:6,elevation:12,shadowColor:'#000',shadowOpacity:.2,shadowRadius:16,shadowOffset:{width:0,height:4}},dobCalendarTop:{height:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:c.divider},dobCalendarTitle:{fontSize:15,fontWeight:'600',color:c.text},dobCalendarNav:{height:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5},calendarArrow:{width:38,height:40,alignItems:'center',justifyContent:'center'},calendarArrowText:{fontSize:30,lineHeight:34,color:c.sub},calendarNavLabel:{minHeight:38,paddingHorizontal:5,flexDirection:'row',alignItems:'center',gap:4},calendarNavText:{fontSize:14,fontWeight:'600',color:c.text},calendarBack:{width:40,height:40,justifyContent:'center'},weekdayRow:{flexDirection:'row',borderBottomWidth:1,borderColor:c.divider},calendarGrid:{flexDirection:'row',flexWrap:'wrap',paddingTop:4},calendarCell:{width:'14.2857%',height:42,alignItems:'center',justifyContent:'center'},weekdayText:{fontSize:11,fontWeight:'500',color:c.sub},calendarDay:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},calendarDayActive:{backgroundColor:c.blue},calendarDayDisabled:{opacity:.32},calendarDayText:{fontSize:13,color:c.text},calendarDayTextActive:{color:'#FFFFFF',fontWeight:'600'},calendarDayTextDisabled:{color:c.light},monthGrid:{minHeight:252,flexDirection:'row',flexWrap:'wrap',alignContent:'center'},monthOption:{width:'33.3333%',height:58,alignItems:'center',justifyContent:'center',borderRadius:12},monthOptionActive:{backgroundColor:c.selected},monthOptionText:{fontSize:14,color:c.text},monthOptionTextActive:{fontWeight:'600',color:'#041E49'},yearList:{height:300},yearListContent:{paddingVertical:6},yearOption:{height:48,alignItems:'center',justifyContent:'center',borderRadius:12},dobCalendarFooter:{height:58,marginTop:5,borderTopWidth:1,borderColor:c.divider,flexDirection:'row',alignItems:'center'},calendarFooterButton:{height:44,paddingHorizontal:12,alignItems:'center',justifyContent:'center'},calendarFooterText:{fontSize:13,fontWeight:'600',color:c.blue},
});
