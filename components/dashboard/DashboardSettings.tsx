
import React, { useState, useRef, useEffect } from 'react';
import { Store, Upload, MapPin, Wallet, Printer, Check, Copy, Loader2, AlertCircle, Download, Clock, Calendar, X, Plus, Save, ShieldCheck, Lock, Share2, Link as LinkIcon, User as UserIcon } from 'lucide-react';
import { Tenant, PrinterSettings, BusinessHours } from '../../types';
import { supabase } from '../../supabaseClient';

const DAYS_MAP: Record<string, string> = { '0': 'Domingo', '1': 'Segunda', '2': 'Terça', '3': 'Quarta', '4': 'Quinta', '5': 'Sexta', '6': 'Sábado' };
const DEFAULT_HOURS: BusinessHours = { open: '18:00', close: '23:00', isOpen: true };

interface DashboardSettingsProps {
  tenant: Tenant;
  onUpdateTenant: (tenant: Tenant) => void;
  onUpdateProfile?: () => void;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({ tenant, onUpdateTenant, onUpdateProfile }) => {
  const [settingsForm, setSettingsForm] = useState<Tenant>(tenant);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    fetchAdminProfile();
  }, []);

  const fetchAdminProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle();
        if (data?.avatar_url) setAdminAvatar(data.avatar_url);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAvatarUploading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Não autenticado");

        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        const { error: upsertError } = await supabase.from('profiles').upsert({
            id: session.user.id,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString()
        });

        if (upsertError) throw upsertError;

        setAdminAvatar(publicUrl);
        if (onUpdateProfile) onUpdateProfile();
    } catch (err: any) {
        alert("Erro no upload do avatar: " + err.message);
    } finally {
        setIsAvatarUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
        const fileName = `logo-${tenant.slug}-${Date.now()}.png`;
        const { error } = await supabase.storage.from('images').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setSettingsForm({ ...settingsForm, logo: publicUrl });
    } catch (err) {
        alert("Erro ao subir logo.");
    } finally { setIsUploadingLogo(false); }
  };

  const handleSaveSettings = async () => {
    setIsSavingAll(true);
    try {
        await supabase.from('tenants').upsert({
           slug: tenant.slug,
           name: settingsForm.name,
           logo: settingsForm.logo,
           whatsapp: (settingsForm.whatsapp || '').replace(/\D/g, ''),
           address: settingsForm.address,
           instagram: settingsForm.instagram,
           pix_key: settingsForm.pixKey,
           payment_link: settingsForm.paymentLink,
           delivery_fee: settingsForm.deliveryFee,
           delivery_time: settingsForm.deliveryTime,
           card_machine_fee: settingsForm.cardMachineFee,
           operating_hours: settingsForm.operatingHours,
           holiday_closures: settingsForm.holidayClosures
        });
        onUpdateTenant(settingsForm);
        alert('Configurações salvas!');
    } catch (err: any) {
        alert("Erro ao salvar: " + err.message);
    } finally { setIsSavingAll(false); }
  };

  return (
    <div className="space-y-8 pb-10">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-6">
              {/* PERFIL DO ADMIN */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px]"><ShieldCheck size={14} className="text-primary"/> Perfil Administrativo</h3>
                 <div className="flex items-center gap-6">
                    <div className="relative group">
                       <div className="w-20 h-20 rounded-2xl border-2 border-white/5 bg-[#09090B] overflow-hidden flex items-center justify-center">
                          {adminAvatar ? (
                             <img src={adminAvatar} className="w-full h-full object-cover" />
                          ) : (
                             <UserIcon size={32} className="text-gray-700" />
                          )}
                          {isAvatarUploading && (
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <Loader2 size={24} className="text-primary animate-spin" />
                             </div>
                          )}
                       </div>
                       <label className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-lg cursor-pointer hover:bg-orange-600 transition-colors">
                          <Upload size={14} className="text-white" />
                          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                       </label>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Foto do Perfil</p>
                       <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-[200px]">Esta foto será exibida no cabeçalho do seu Dashboard.</p>
                    </div>
                 </div>
              </div>

              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px]"><Store size={14} className="text-primary"/> Dados da Unidade</h3>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 bg-black/50 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative">
                          <img src={settingsForm.logo} className="w-full h-full object-cover" />
                          <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                             <Upload size={16} className="text-white" />
                             <input type="file" className="hidden" onChange={handleLogoUpload} />
                          </label>
                       </div>
                       <div className="flex-1 space-y-2">
                          <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full bg-[#09090B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white" placeholder="Nome do Trailer" />
                          <input type="text" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full bg-[#09090B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white" placeholder="Endereço" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px]"><Wallet size={14} className="text-primary"/> Financeiro & Pix</h3>
                 <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Taxa Entrega (R$)</label>
                          <input type="number" value={settingsForm.deliveryFee} onChange={e => setSettingsForm({...settingsForm, deliveryFee: parseFloat(e.target.value)})} className="w-full bg-[#09090B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-500 uppercase">Taxa Cartão (%)</label>
                          <input type="number" value={settingsForm.cardMachineFee} onChange={e => setSettingsForm({...settingsForm, cardMachineFee: parseFloat(e.target.value)})} className="w-full bg-[#09090B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white" />
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-bold text-gray-500 uppercase">Chave Pix</label>
                       <input type="text" value={settingsForm.pixKey} onChange={e => setSettingsForm({...settingsForm, pixKey: e.target.value})} className="w-full bg-[#09090B] border border-white/5 rounded-lg px-3 py-2 text-xs text-white" />
                    </div>
                 </div>
              </div>
           </div>
       </div>

       <button onClick={handleSaveSettings} disabled={isSavingAll} className="w-full bg-primary hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
          {isSavingAll ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
          {isSavingAll ? 'Sincronizando...' : 'Salvar Todas Alterações'}
       </button>
    </div>
  );
};

export default DashboardSettings;
