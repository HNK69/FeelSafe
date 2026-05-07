// components/EscalationModal.jsx
// Auto-escalation animation overlay — shown when MEDIUM or HIGH threat detected
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Phone, MessageCircle, X, CheckCircle } from 'lucide-react';

export default function EscalationModal({ riskLevel, escalationResult, threatText, onClose }) {
  const [step, setStep] = useState(0); // 0=detecting 1=escalating 2=sent
  const isHigh  = riskLevel === 'HIGH';
  const color   = isHigh ? '#FF3B5C' : '#FFC857';
  const bg      = isHigh ? 'rgba(255,59,92,0.08)' : 'rgba(255,200,87,0.08)';

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const contacts = escalationResult?.auto_contacts_notified || [];
  const waLink   = escalationResult?.whatsapp_link;
  const mapsLink = escalationResult?.maps_link;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        style={{ background: 'rgba(11,16,32,0.92)', backdropFilter: 'blur(12px)' }}>

        {/* Background glow */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: color, filter: 'blur(120px)' }} />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="relative w-full max-w-sm rounded-3xl p-7 border"
          style={{ background: bg, borderColor: `${color}55`, boxShadow: `0 0 40px ${color}33` }}>

          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={step < 2 ? { scale: [1, 1.1, 1] } : { scale: 1 }}
              transition={{ repeat: step < 2 ? Infinity : 0, duration: 1 }}
              className="w-20 h-20 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: color, background: `${color}18` }}>
              <ShieldAlert className="w-10 h-10" style={{ color }} />
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black" style={{ color }}>
              {isHigh ? 'HIGH RISK DETECTED' : 'MEDIUM RISK DETECTED'}
            </h2>
            {threatText && (
              <p className="text-gray-400 text-sm mt-2 italic">
                "{threatText.slice(0, 80)}{threatText.length > 80 ? '...' : ''}"
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-5">
            <EscStep done={step >= 0} active={step === 0} color={color}
              icon={<ShieldAlert className="w-4 h-4" />}
              label="Threat analyzed by AI" />
            <EscStep done={step >= 1} active={step === 1} color={color}
              icon={<Phone className="w-4 h-4" />}
              label={contacts.length > 0
                ? `Notifying ${contacts.length} emergency contact(s)`
                : 'Preparing emergency alert'} />
            <EscStep done={step >= 2} active={step === 2} color={color}
              icon={<MessageCircle className="w-4 h-4" />}
              label="WhatsApp alert ready to send" />
          </div>

          {/* Contacts */}
          {step >= 2 && contacts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl border border-white/10 bg-black/30">
              <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Contacts Being Alerted</p>
              <div className="space-y-1.5">
                {contacts.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#00FF9D]" />
                      <span className="text-sm font-bold">{c.contact_name}</span>
                    </div>
                    {c.whatsapp_link && (
                      <a href={c.whatsapp_link} target="_blank" rel="noreferrer"
                        className="text-xs text-[#25D366] font-bold hover:underline">Open WA</a>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          {step >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-black"
                  style={{ background: color }}>
                  <MessageCircle className="w-5 h-5" /> Send WhatsApp Alert Now
                </a>
              )}
              {mapsLink && (
                <a href={mapsLink} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl font-bold border border-white/20 text-white text-sm hover:bg-white/5">
                  Share Live Location
                </a>
              )}
              <button onClick={onClose}
                className="w-full py-2 rounded-xl text-sm text-gray-500 hover:text-white">
                I am safe — dismiss
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function EscStep({ done, active, color, icon, label }) {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        animate={active ? { scale: [1, 1.15, 1] } : {}}
        transition={{ repeat: active ? Infinity : 0, duration: 0.8 }}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
        style={{
          borderColor: done ? color : '#374151',
          background:  done ? `${color}22` : 'transparent',
          color:       done ? color : '#6B7280',
        }}>
        {done ? <CheckCircle className="w-4 h-4" /> : icon}
      </motion.div>
      <span className={`text-sm font-medium ${done ? 'text-white' : 'text-gray-500'}`}>{label}</span>
    </div>
  );
}
