
import React, { useState, useRef, useEffect } from 'react';
import { Store, Upload, MapPin, Wallet, Printer, Check, Copy, Loader2, AlertCircle, Download, Clock, Calendar, X, Plus, Save } from 'lucide-react';
import { Tenant, PrinterSettings, BusinessHours } from '../../types';
import { supabase } from '../../supabaseClient';

const DAYS_MAP: Record<string, string> = {
  '0': 'Domingo',
  '1': 'Segunda',
  '2': 'Terça',
  '3': 'Quarta',
  '4': 'Quinta',
  '5': 'Sexta',
  '6': 'Sábado'
};

const DEFAULT_HOURS: BusinessHours = { open: '18:00', close: '23:00', isOpen: true };

interface DashboardSettingsProps {
  tenant: Tenant;
  onUpdateTenant: (tenant: Tenant) => void;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({ tenant, onUpdateTenant }) => {
  const [settingsForm, setSettingsForm] = useState<Tenant>(tenant);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({ printerWidth: 80, autoPrint: false, headerText: '', footerText: '' });
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // States for Holiday Logic
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const qrcodeContainerRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Garante que todos os dias da semana existam no operatingHours
    const baseHours = tenant.operatingHours || {};
    const normalizedHours: Record<string, BusinessHours> = {};
    Object.keys(DAYS_MAP).forEach(key => {
        normalizedHours[key] = baseHours[key] || { ...DEFAULT_HOURS };
    });

    setSettingsForm({
        ...tenant,
        operatingHours: normalizedHours
    });
    
    fetchPrinterSettings();
  }, [tenant]);

  useEffect(() => {
    if (qrcodeContainerRef.current) {
      qrcodeContainerRef.current.innerHTML = '';
      const storeUrl = `${window.location.origin}${window.location.pathname}?loja=${tenant.slug}`;
      // @ts-ignore
      if (window.QRCode) {
        // @ts-ignore
        new window.QRCode(qrcodeContainerRef.current, {
          text: storeUrl,
          width: 140,
          height: 140,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: 1 
        });
      }
    }
  }, [tenant.slug]);

  const fetchPrinterSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .eq('tenant_slug', tenant.slug)
        .maybeSingle(); // Busca segura
      
      if (error) throw error;

      if (data) {
        setPrinterSettings({
           printerWidth: data.paper_width || 80,
           autoPrint: data.auto_print || false,
           ipAddress: data.printer_name || '', // Mapeado para o campo interno ipAddress por compatibilidade
           headerText: data.header_text || '',
           footerText: data.footer_text || ''
        });
      } else {
        // Fallback para valores padrão
        setPrinterSettings({ printerWidth: 80, autoPrint: false, headerText: '', footerText: '' });
      }
    } catch (err) {
      console.log("Sem config de impressora encontrada ou erro, usando padrão.");
      setPrinterSettings({ printerWidth: 80, autoPrint: false, headerText: '', footerText: '' });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const name = settingsForm.name || '';
    const address = settingsForm.address || '';
    const whatsapp = settingsForm.whatsapp || '';

    if (!name.trim()) newErrors.name = "Nome da loja é obrigatório";
    if (!address.trim()) newErrors.address = "Endereço é obrigatório";
    
    const phoneRegex = /^[0-9]{10,13}$/;
    if (!whatsapp.replace(/\D/g, '').match(phoneRegex)) {
        newErrors.whatsapp = "Digite apenas números (DDD + Número)";
    }

    if (settingsForm.deliveryFee < 0) newErrors.deliveryFee = "Valor não pode ser negativo";
    if (settingsForm.cardMachineFee < 0) newErrors.cardMachineFee = "Taxa não pode ser negativa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.slug}-logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Certifique-se de que o bucket "images" está configurado como público no Supabase.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const publicUrl = await uploadImageToStorage(file);
      if (publicUrl) {
        setSettingsForm({ ...settingsForm, logo: publicUrl });
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!validateForm()) {
        alert("Por favor, corrija os erros no formulário antes de salvar.");
        return;
    }

    setIsSavingAll(true);
    try {
        const { error: tenantError } = await supabase.from('tenants').upsert({
           slug: tenant.slug,
           name: settingsForm.name,
           logo: settingsForm.logo,
           whatsapp: (settingsForm.whatsapp || '').replace(/\D/g, ''),
           address: settingsForm.address,
           instagram: settingsForm.instagram,
           pix_key: settingsForm.pixKey,
           payment_link: settingsForm.paymentLink,
           delivery_fee: settingsForm.deliveryFee,
           card_machine_fee: settingsForm.cardMachineFee,
           operating_hours: settingsForm.operatingHours,
           holiday_closures: settingsForm.holidayClosures
        });

        if (tenantError) throw tenantError;

        // Salvamento com os nomes de colunas atualizados no banco
        const { error: printerError } = await supabase.from('printer_settings').upsert({
           tenant_slug: tenant.slug,
           paper_width: printerSettings.printerWidth,
           auto_print: printerSettings.autoPrint,
           printer_name: printerSettings.ipAddress || null,
           header_text: printerSettings.headerText || null,
           footer_text: printerSettings.footerText || null
        }, { onConflict: 'tenant_slug' });

        if (printerError) throw printerError;

        onUpdateTenant(settingsForm);
        alert('Configurações salvas com sucesso no banco de dados!');
    } catch (err: any) {
        console.error("Erro ao salvar configurações:", err);
        alert("Erro ao salvar no banco de dados: " + (err.message || "Tente novamente."));
    } finally {
        setIsSavingAll(false);
    }
  };

  const handleCopyMenuLink = () => {
    const menuUrl = `${window.location.origin}${window.location.pathname}?loja=${tenant.slug}`;
    navigator.clipboard.writeText(menuUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = qrcodeContainerRef.current?.querySelector('canvas');
    const img = qrcodeContainerRef.current?.querySelector('img');
    let url = '';

    if (canvas) {
        url = canvas.toDataURL("image/png");
    } else if (img) {
        url = img.src;
    }

    if (url) {
        const link = document.createElement('a');
        link.download = `qrcode-${tenant.slug}.png`;
        link.href = url;
        link.click();
    }
  };

  // Operating Hours Handlers com acesso seguro
  const handleDayToggle = (day: string) => {
      setSettingsForm(prev => {
          const currentHours = prev.operatingHours?.[day] || { ...DEFAULT_HOURS };
          return {
              ...prev,
              operatingHours: {
                  ...(prev.operatingHours || {}),
                  [day]: { ...currentHours, isOpen: !currentHours.isOpen }
              }
          };
      });
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
      setSettingsForm(prev => {
          const currentHours = prev.operatingHours?.[day] || { ...DEFAULT_HOURS };
          return {
              ...prev,
              operatingHours: {
                  ...(prev.operatingHours || {}),
                  [day]: { ...currentHours, [field]: value }
              }
          };
      });
  };

  // Holiday Handlers
  const addHoliday = () => {
      if (!newHolidayDate) return;
      const currentHolidays = settingsForm.holidayClosures || [];
      if (!currentHolidays.includes(newHolidayDate)) {
          setSettingsForm({ ...settingsForm, holidayClosures: [...currentHolidays, newHolidayDate].sort() });
      }
      setNewHolidayDate('');
  };

  const removeHoliday = (date: string) => {
      setSettingsForm({ ...settingsForm, holidayClosures: (settingsForm.holidayClosures || []).filter(d => d !== date) });
  };

  return (
    <div className="space-y-8 pb-10">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* LEFT COLUMN */}
           <div className="space-y-6">
              {/* Identity */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><Store size={14} className="text-primary"/> Identidade da Loja</h3>
                 
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="w-20 h-20 bg-black/50 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden relative group">
                          <img src={settingsForm.logo} className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-30' : 'opacity-100'}`} />
                          
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 size={24} className="text-primary animate-spin" />
                            </div>
                          )}

                          {!isUploading && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                <Upload size={20} className="text-white" />
                                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            </div>
                          )}
                       </div>
                       <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            value={settingsForm.name} 
                            onChange={e => { setSettingsForm({...settingsForm, name: e.target.value}); setErrors({...errors, name: ''}); }} 
                            className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50 ${errors.name ? 'border-red-500/50' : 'border-white/10'}`} 
                            placeholder="Nome da Loja" 
                          />
                          {errors.name && <span className="text-red-500 text-[9px] flex items-center gap-1"><AlertCircle size={8}/> {errors.name}</span>}
                          
                          <input type="text" value={settingsForm.slug} disabled className="w-full bg-[#09090B] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-500 cursor-not-allowed" title="Slug não pode ser alterado" />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Address */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><MapPin size={14} className="text-primary"/> Endereço & Contato</h3>
                 <div className="space-y-3">
                    <div>
                        <input 
                            type="text" 
                            value={settingsForm.address} 
                            onChange={e => { setSettingsForm({...settingsForm, address: e.target.value}); setErrors({...errors, address: ''}); }} 
                            className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50 ${errors.address ? 'border-red-500/50' : 'border-white/10'}`} 
                            placeholder="Endereço Completo" 
                        />
                        {errors.address && <span className="text-red-500 text-[9px] flex items-center gap-1 mt-1"><AlertCircle size={8}/> {errors.address}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                           <input 
                                type="text" 
                                value={settingsForm.whatsapp} 
                                onChange={e => { setSettingsForm({...settingsForm, whatsapp: e.target.value}); setErrors({...errors, whatsapp: ''}); }} 
                                className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50 ${errors.whatsapp ? 'border-red-500/50' : 'border-white/10'}`} 
                                placeholder="WhatsApp (apenas números)" 
                           />
                           {errors.whatsapp && <span className="text-red-500 text-[9px] flex items-center gap-1 mt-1"><AlertCircle size={8}/> {errors.whatsapp}</span>}
                       </div>
                       <input type="text" value={settingsForm.instagram} onChange={e => setSettingsForm({...settingsForm, instagram: e.target.value})} className="bg-[#09090B] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50" placeholder="@instagram" />
                    </div>
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN */}
           <div className="space-y-6">
              {/* Finance */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><Wallet size={14} className="text-primary"/> Financeiro</h3>
                 <div className="space-y-3">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-gray-500 uppercase">Chave Pix</label>
                       <input type="text" value={settingsForm.pixKey} onChange={e => setSettingsForm({...settingsForm, pixKey: e.target.value})} className="w-full bg-[#09090B] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-gray-500 uppercase">Link de Pagamento (Máquina de Cartão)</label>
                       <input 
                         type="text" 
                         value={settingsForm.paymentLink || ''} 
                         onChange={e => setSettingsForm({...settingsForm, paymentLink: e.target.value})} 
                         className="w-full bg-[#09090B] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50" 
                         placeholder="https://pay.sumup.io/..."
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Taxa Entrega (R$)</label>
                          <input 
                            type="number" 
                            step="0.50" 
                            value={settingsForm.deliveryFee} 
                            onChange={e => { setSettingsForm({...settingsForm, deliveryFee: parseFloat(e.target.value)}); setErrors({...errors, deliveryFee: ''}); }} 
                            className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50 ${errors.deliveryFee ? 'border-red-500/50' : 'border-white/10'}`} 
                          />
                          {errors.deliveryFee && <span className="text-red-500 text-[9px]">{errors.deliveryFee}</span>}
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Taxa Maquininha (%)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            value={settingsForm.cardMachineFee} 
                            onChange={e => { setSettingsForm({...settingsForm, cardMachineFee: parseFloat(e.target.value)}); setErrors({...errors, cardMachineFee: ''}); }} 
                            className={`w-full bg-[#09090B] border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/50 ${errors.cardMachineFee ? 'border-red-500/50' : 'border-white/10'}`} 
                          />
                          {errors.cardMachineFee && <span className="text-red-500 text-[9px]">{errors.cardMachineFee}</span>}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Printer */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
                 <h3 className="text-white font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><Printer size={14} className="text-primary"/> Impressora Térmica</h3>
                 <div className="space-y-3">
                     <div className="flex items-center gap-4 mb-2">
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="width" checked={printerSettings.printerWidth === 58} onChange={() => setPrinterSettings({...printerSettings, printerWidth: 58})} className="accent-primary" />
                             <span className="text-xs text-gray-300">58mm</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="width" checked={printerSettings.printerWidth === 80} onChange={() => setPrinterSettings({...printerSettings, printerWidth: 80})} className="accent-primary" />
                             <span className="text-xs text-gray-300">80mm</span>
                         </label>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-[#09090B] rounded-lg border border-white/5">
                         <span className="text-xs font-bold text-gray-400">Impressão Automática</span>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={printerSettings.autoPrint} onChange={e => setPrinterSettings({...printerSettings, autoPrint: e.target.checked})} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                         </label>
                     </div>
                 </div>
              </div>

              {/* QR Code */}
              <div className="bg-[#161618] border border-white/5 rounded-2xl p-6 flex gap-4 items-center">
                 <div className="p-2 bg-white rounded-xl" ref={qrcodeContainerRef} />
                 <div className="flex-1 space-y-3">
                    <h4 className="text-sm font-bold text-white mb-1">Link do Cardápio</h4>
                    <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}${window.location.pathname}?loja=${tenant.slug}`} 
                        className="w-full bg-[#09090B] border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 font-mono"
                    />
                    <div className="flex gap-2">
                        <button onClick={handleCopyMenuLink} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                           {copiedLink ? <Check size={12}/> : <Copy size={12}/>} {copiedLink ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button onClick={handleDownloadQR} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                           <Download size={12}/> Baixar QR
                        </button>
                    </div>
                 </div>
              </div>
           </div>
       </div>

       {/* FULL WIDTH - HORÁRIOS */}
       <div className="bg-[#161618] border border-white/5 rounded-2xl p-6">
           <h3 className="text-white font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-xs"><Clock size={14} className="text-primary"/> Horários e Funcionamento</h3>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Dias da Semana */}
               <div className="lg:col-span-2 space-y-2">
                   <div className="grid grid-cols-4 gap-2 mb-2 px-2 text-[10px] font-bold uppercase text-gray-500 tracking-widest">
                       <div className="col-span-1">Dia</div>
                       <div className="text-center">Abertura</div>
                       <div className="text-center">Fechamento</div>
                       <div className="text-center">Status</div>
                   </div>
                   {Object.entries(DAYS_MAP).map(([key, label]) => {
                       const hours = settingsForm.operatingHours?.[key] || { ...DEFAULT_HOURS };
                       return (
                           <div key={key} className={`grid grid-cols-4 gap-2 items-center p-2 rounded-lg border transition-all ${hours.isOpen ? 'bg-[#09090B] border-white/5' : 'bg-red-500/5 border-red-500/10 opacity-60'}`}>
                               <span className="text-xs font-bold text-white">{label}</span>
                               <input 
                                   type="time" 
                                   value={hours.open} 
                                   onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
                                   disabled={!hours.isOpen}
                                   className="bg-[#161618] border border-white/10 rounded px-2 py-1 text-xs text-white text-center focus:border-primary/50 outline-none"
                               />
                               <input 
                                   type="time" 
                                   value={hours.close} 
                                   onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
                                   disabled={!hours.isOpen}
                                   className="bg-[#161618] border border-white/10 rounded px-2 py-1 text-xs text-white text-center focus:border-primary/50 outline-none"
                               />
                               <div className="flex justify-center">
                                   <label className="relative inline-flex items-center cursor-pointer">
                                       <input type="checkbox" checked={hours.isOpen} onChange={() => handleDayToggle(key)} className="sr-only peer" />
                                       <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                                   </label>
                               </div>
                           </div>
                       );
                   })}
               </div>

               {/* Folgas / Feriados */}
               <div className="bg-[#09090B] border border-white/5 rounded-xl p-4">
                   <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> Fechar em Datas Específicas</h4>
                   <div className="flex gap-2 mb-4">
                       <input 
                           type="date" 
                           value={newHolidayDate} 
                           onChange={(e) => setNewHolidayDate(e.target.value)}
                           className="flex-1 bg-[#161618] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-primary/50 outline-none"
                       />
                       <button onClick={addHoliday} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                           <Plus size={16} />
                       </button>
                   </div>
                   
                   <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                       {(settingsForm.holidayClosures || []).length === 0 && (
                           <p className="text-[10px] text-gray-600 text-center py-4">Nenhuma data fechada.</p>
                       )}
                       {(settingsForm.holidayClosures || []).map(date => (
                           <div key={date} className="flex justify-between items-center bg-[#161618] border border-white/5 p-2 rounded-lg">
                               <span className="text-xs text-gray-300 font-mono">{new Date(date).toLocaleDateString('pt-BR')}</span>
                               <button onClick={() => removeHoliday(date)} className="text-gray-500 hover:text-red-500 transition-colors">
                                   <X size={14} />
                               </button>
                           </div>
                       ))}
                   </div>
               </div>
           </div>
       </div>

       <button 
         onClick={handleSaveSettings} 
         disabled={isUploading || isSavingAll}
         className={`w-full bg-primary hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 ${ (isUploading || isSavingAll) ? 'opacity-50 cursor-not-allowed' : ''}`}
       >
          { (isUploading || isSavingAll) ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/> }
          { (isUploading || isSavingAll) ? 'Salvando Alterações...' : 'Salvar Todas Alterações no Banco' }
       </button>
    </div>
  );
};

export default DashboardSettings;
