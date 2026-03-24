// ================================================================
// DigiID Verify — i18n Translations (English + Hindi)
// translations.js — Pure vanilla JS, no external libraries
// ================================================================

window.currentLang = localStorage.getItem('digiid-lang') || 'en';

window.TRANSLATIONS = {
  en: {
    // ── Header / Nav (index.html) ──
    "gov_of_india": "Government of India",
    "ministry_eit": "Ministry of Electronics & IT",
    "dashboard": "Dashboard",
    "language": "Language",

    // ── Hero ──
    "welcome_back": "Welcome Back",
    "verification_status_active": "● Verification Status: Active",
    "network_govmainnet": "Network: GOV-MAINNET",
    "view_audit_trail": "View Audit Trail",

    // ── Stats ──
    "total_documents": "Total Documents",
    "blockchain_secured": "Blockchain Secured",
    "last_sync": "Last Sync",
    "account_status": "Account Status",
    "pending": "Pending",
    "submit_to_activate": "Submit to activate",
    "never": "Never",
    "no_documents_yet": "No documents yet",
    "auto_sync_enabled": "Auto-sync enabled",
    "verified": "Verified",
    "identity_confirmed": "Identity confirmed",

    // ── Form Panel ──
    "verify_anchor_details": "Verify & Anchor Details",
    "document_submission": "Document Submission",
    "smart_extract": "Smart Extract",
    "document_type": "Document Type",
    "aadhaar": "Aadhaar",
    "pan": "PAN",
    "voter_id": "Voter ID",
    "full_name": "Full Name",
    "dob": "DOB",
    "aadhaar_number": "Aadhaar Number",
    "pan_number": "PAN Number",
    "epic_number": "EPIC Number",
    "address": "Address",
    "declaration_text": "I hereby give my consent to DigiID Verify to fetch and anchor my document details on the GOV-MAINNET blockchain for verification purposes as per the IT Act.",
    "secure_verify_document": "Secure & Verify Document",

    // ── Placeholders ──
    "placeholder_enter_name": "Enter as per document",
    "placeholder_aadhaar": "XXXX XXXX XXXX",
    "placeholder_pan": "ABCDE1234F",
    "placeholder_epic": "ABC1234567",
    "placeholder_address": "Current residential address",
    "placeholder_identity_no": "Aadhaar / PAN / EPIC No.",

    // ── Vault ──
    "blockchain_vault": "Blockchain Vault",
    "no_secured_documents": "No Secured Documents",
    "vault_empty_desc": "Verify your first document to anchor it to the blockchain vault.",
    "all_3_secured": "All 3 documents fully secured on the ledger",
    "documents_count": "Documents",
    "document_count_singular": "Document",

    // ── Quick Verify ──
    "quick_identity_verify": "Quick Identity Verify",
    "identity_number": "Identity Number",
    "date_of_birth": "Date of Birth",
    "verify_identity": "Verify Identity",
    "aadhaar_card": "Aadhaar Card",
    "pan_card": "PAN Card",

    // ── Modal ──
    "identity_anchored_success": "Identity Anchored Successfully",
    "record_secured_ledger": "Record secured on the government ledger",
    "doc_anchored_blockchain": "Document anchored to the blockchain ledger.",
    "sha256_fingerprint": "SHA-256 Blockchain Fingerprint",
    "done": "Done",

    // ── Footer (index.html) ──
    "footer_ministry": "Ministry of Electronics & Information Technology",
    "footer_copy": "© 2025 DigiID Verify. All Rights Reserved.",
    "privacy_policy": "Privacy Policy",
    "terms_of_service": "Terms of Service",
    "contact_us": "Contact Us",

    // ── Dynamic JS strings ──
    "anchoring_to_ledger": "Anchoring to Ledger…",
    "secure_details_ledger": "Secure Details on Ledger",
    "accept_declaration_error": "Please accept the declaration before submitting.",
    "already_anchored_session": "has already been anchored to the vault this session.",
    "fill_required_fields": "Please fill in all required fields (*).",
    "identity_already_anchored": "This identity number is already anchored on the ledger.",
    "validation_failed": "Validation failed — check your inputs.",
    "general_error": "An error occurred. Please try again.",
    "cannot_reach_server": "Cannot reach server. Ensure the backend is running on localhost:3000.",
    "enter_both_fields": "Please enter both Identity Number and Date of Birth.",
    "verifying": "Verifying…",
    "authentic": "AUTHENTIC",
    "verified_via": "verified via",
    "not_verified": "NOT VERIFIED",
    "not_found_reason": "Identity not found on the ledger.",
    "hash_mismatch_reason": "Hash mismatch — record may be tampered.",
    "cannot_connect_server": "Cannot connect to server.",
    "blockchain_fingerprint": "Blockchain Fingerprint",
    "badge_verified": "✓ Verified",
    "audit_alert": "Audit Trail: All transactions are immutably recorded on GOV-MAINNET.\nFull on-chain log viewer is in development.",
    "smart_extract_alert": "Smart Extract (AI): Document image → auto-fill fields.\nNIC Document AI integration coming soon.",
    "just_now": "Just now",
    "min_ago": "min ago",
    "hr_ago": "hr ago",

    // ── Login page ──
    "sign_in": "Sign In",
    "welcome_digiid": "Welcome to DigiID Verify",
    "citizen_id": "Citizen ID",
    "password": "Password",
    "remember_me": "Remember me",
    "sign_in_btn": "Sign in",
    "forgot_credentials": "Forgot credentials?",
    "login_to_account": "Login to your account",
    "select_login_method": "Select your preferred login method",
    "mobile_otp": "Mobile / OTP",
    "digilocker": "DigiLocker",
    "mobile_number": "Mobile Number",
    "placeholder_mobile": "Enter 10-digit number",
    "request_otp": "Request OTP",
    "or_sign_in_with": "OR SIGN IN WITH",
    "login_with_digilocker": "Login with DigiLocker",
    "enter_otp": "Enter OTP",
    "verify_otp_login": "Verify OTP & Login",
    "change_mobile": "✏ Change mobile number",
    "mobile_aadhaar": "Mobile / Aadhaar Number",
    "placeholder_linked_mobile": "Linked mobile or Aadhaar",
    "connect_digilocker": "Connect with DigiLocker",
    "new_user_register": "New user?",
    "register_here": "Register here",
    "help_desk": "Help Desk",
    "security_faq": "Security FAQ",
    "gov_topbar_text": "Government of India  |  Ministry of Electronics & Information Technology",
    "national_id_portal": "National ID Verification Portal",
    "one_identity": "One Identity,",
    "infinite_possibilities": "Infinite Possibilities.",
    "highly_secure": "Highly Secure",
    "highly_secure_desc": "End-to-end encrypted authentication for all government portals.",
    "digilocker_integration": "DigiLocker Integration",
    "digilocker_integration_desc": "Access your digital documents instantly upon login.",
    "paperless_verification": "Paperless Verification",
    "paperless_verification_desc": "Seamlessly verify your identity across departments.",
    "cert_badge_text": "Certified GIGW 3.0 & STQC Compliant Architecture",
    "digilocker_info": "You will be securely redirected to the DigiLocker platform to authenticate using your Aadhaar-linked credentials. Your data is protected under the DPDP Act, 2023.",
    "footer_copy_login": "© 2025 Ministry of Electronics & Information Technology, Government of India.",
    "footer_motto": "Secure • Transparent • Sovereign",
    "valid_mobile_error": "Please enter a valid 10-digit mobile number.",
    "otp_sent_demo": "OTP sent to +91 {number}. (Demo: enter any 6-digit code)",
    "otp_resent_demo": "OTP resent. (Demo: enter any 6-digit code)",
    "complete_otp_error": "Please enter the complete 6-digit OTP.",
    "otp_verified_redirect": "OTP verified! Redirecting to dashboard…",
    "enter_linked_error": "Please enter your linked mobile or Aadhaar number.",
    "connecting_digilocker": "Connecting to DigiLocker… (Demo: redirecting to dashboard)",
    "resend": "Resend",
    "resend_otp": "Resend OTP",
    "dark_mode": "Dark Mode",
    "light_mode": "Light Mode",
  },

  hi: {
    // ── Header / Nav (index.html) ──
    "gov_of_india": "भारत सरकार",
    "ministry_eit": "इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय",
    "dashboard": "डैशबोर्ड",
    "language": "भाषा",

    // ── Hero ──
    "welcome_back": "वापसी पर स्वागत है",
    "verification_status_active": "● सत्यापन स्थिति: सक्रिय",
    "network_govmainnet": "नेटवर्क: GOV-MAINNET",
    "view_audit_trail": "ऑडिट ट्रेल देखें",

    // ── Stats ──
    "total_documents": "कुल दस्तावेज़",
    "blockchain_secured": "ब्लॉकचेन सुरक्षित",
    "last_sync": "अंतिम सिंक",
    "account_status": "खाता स्थिति",
    "pending": "लंबित",
    "submit_to_activate": "सक्रिय करने के लिए जमा करें",
    "never": "कभी नहीं",
    "no_documents_yet": "अभी तक कोई दस्तावेज़ नहीं",
    "auto_sync_enabled": "ऑटो-सिंक सक्षम",
    "verified": "सत्यापित",
    "identity_confirmed": "पहचान की पुष्टि",

    // ── Form Panel ──
    "verify_anchor_details": "विवरण सत्यापित करें और एंकर करें",
    "document_submission": "दस्तावेज़ जमा करें",
    "smart_extract": "स्मार्ट एक्सट्रैक्ट",
    "document_type": "दस्तावेज़ प्रकार",
    "aadhaar": "आधार",
    "pan": "पैन",
    "voter_id": "मतदाता पहचान पत्र",
    "full_name": "पूरा नाम",
    "dob": "जन्म तिथि",
    "aadhaar_number": "आधार नंबर",
    "pan_number": "पैन नंबर",
    "epic_number": "EPIC नंबर",
    "address": "पता",
    "declaration_text": "मैं एतद्द्वारा DigiID Verify को IT अधिनियम के अनुसार सत्यापन हेतु GOV-MAINNET ब्लॉकचेन पर मेरे दस्तावेज़ विवरण प्राप्त करने और संलग्न करने की अनुमति देता/देती हूँ।",
    "secure_verify_document": "दस्तावेज़ सुरक्षित करें और सत्यापित करें",

    // ── Placeholders ──
    "placeholder_enter_name": "दस्तावेज़ के अनुसार दर्ज करें",
    "placeholder_aadhaar": "XXXX XXXX XXXX",
    "placeholder_pan": "ABCDE1234F",
    "placeholder_epic": "ABC1234567",
    "placeholder_address": "वर्तमान आवासीय पता",
    "placeholder_identity_no": "आधार / पैन / EPIC नं.",

    // ── Vault ──
    "blockchain_vault": "ब्लॉकचेन वॉल्ट",
    "no_secured_documents": "कोई सुरक्षित दस्तावेज़ नहीं",
    "vault_empty_desc": "अपना पहला दस्तावेज़ सत्यापित करें और उसे ब्लॉकचेन वॉल्ट से जोड़ें।",
    "all_3_secured": "सभी 3 दस्तावेज़ लेज़र पर पूरी तरह सुरक्षित हैं",
    "documents_count": "दस्तावेज़",
    "document_count_singular": "दस्तावेज़",

    // ── Quick Verify ──
    "quick_identity_verify": "त्वरित पहचान सत्यापन",
    "identity_number": "पहचान संख्या",
    "date_of_birth": "जन्म तिथि",
    "verify_identity": "पहचान सत्यापित करें",
    "aadhaar_card": "आधार कार्ड",
    "pan_card": "पैन कार्ड",

    // ── Modal ──
    "identity_anchored_success": "पहचान सफलतापूर्वक एंकर की गई",
    "record_secured_ledger": "सरकारी लेज़र पर रिकॉर्ड सुरक्षित",
    "doc_anchored_blockchain": "दस्तावेज़ ब्लॉकचेन लेज़र पर एंकर किया गया।",
    "sha256_fingerprint": "SHA-256 ब्लॉकचेन फ़िंगरप्रिंट",
    "done": "हो गया",

    // ── Footer (index.html) ──
    "footer_ministry": "इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय",
    "footer_copy": "© 2025 DigiID Verify. सर्वाधिकार सुरक्षित।",
    "privacy_policy": "गोपनीयता नीति",
    "terms_of_service": "सेवा की शर्तें",
    "contact_us": "संपर्क करें",

    // ── Dynamic JS strings ──
    "anchoring_to_ledger": "लेज़र पर एंकर हो रहा है…",
    "secure_details_ledger": "लेज़र पर विवरण सुरक्षित करें",
    "accept_declaration_error": "कृपया जमा करने से पहले घोषणा स्वीकार करें।",
    "already_anchored_session": "इस सत्र में पहले ही वॉल्ट में एंकर किया जा चुका है।",
    "fill_required_fields": "कृपया सभी आवश्यक फ़ील्ड (*) भरें।",
    "identity_already_anchored": "यह पहचान संख्या पहले से लेज़र पर एंकर है।",
    "validation_failed": "सत्यापन विफल — अपने इनपुट जाँचें।",
    "general_error": "एक त्रुटि हुई। कृपया पुनः प्रयास करें।",
    "cannot_reach_server": "सर्वर से संपर्क नहीं हो पा रहा। सुनिश्चित करें कि बैकएंड localhost:3000 पर चल रहा है।",
    "enter_both_fields": "कृपया पहचान संख्या और जन्म तिथि दोनों दर्ज करें।",
    "verifying": "सत्यापित हो रहा है…",
    "authentic": "प्रामाणिक",
    "verified_via": "के माध्यम से सत्यापित",
    "not_verified": "सत्यापित नहीं",
    "not_found_reason": "लेज़र पर पहचान नहीं मिली।",
    "hash_mismatch_reason": "हैश मेल नहीं खाता — रिकॉर्ड से छेड़छाड़ हो सकती है।",
    "cannot_connect_server": "सर्वर से कनेक्ट नहीं हो पा रहा।",
    "blockchain_fingerprint": "ब्लॉकचेन फ़िंगरप्रिंट",
    "badge_verified": "✓ सत्यापित",
    "audit_alert": "ऑडिट ट्रेल: सभी लेन-देन GOV-MAINNET पर अपरिवर्तनीय रूप से दर्ज हैं।\nपूर्ण ऑन-चेन लॉग व्यूअर विकास में है।",
    "smart_extract_alert": "स्मार्ट एक्सट्रैक्ट (AI): दस्तावेज़ छवि → फ़ील्ड ऑटो-भरें।\nNIC Document AI एकीकरण जल्द आ रहा है।",
    "just_now": "अभी",
    "min_ago": "मिनट पहले",
    "hr_ago": "घंटे पहले",

    // ── Login page ──
    "sign_in": "साइन इन",
    "welcome_digiid": "DigiID Verify में आपका स्वागत है",
    "citizen_id": "नागरिक ID",
    "password": "पासवर्ड",
    "remember_me": "मुझे याद रखें",
    "sign_in_btn": "साइन इन करें",
    "forgot_credentials": "क्रेडेंशियल भूल गए?",
    "login_to_account": "अपने खाते में लॉगिन करें",
    "select_login_method": "अपनी पसंदीदा लॉगिन विधि चुनें",
    "mobile_otp": "मोबाइल / OTP",
    "digilocker": "डिजिलॉकर",
    "mobile_number": "मोबाइल नंबर",
    "placeholder_mobile": "10 अंकों का नंबर दर्ज करें",
    "request_otp": "OTP का अनुरोध करें",
    "or_sign_in_with": "या इसके साथ साइन इन करें",
    "login_with_digilocker": "डिजिलॉकर से लॉगिन करें",
    "enter_otp": "OTP दर्ज करें",
    "verify_otp_login": "OTP सत्यापित करें और लॉगिन करें",
    "change_mobile": "✏ मोबाइल नंबर बदलें",
    "mobile_aadhaar": "मोबाइल / आधार नंबर",
    "placeholder_linked_mobile": "लिंक किया गया मोबाइल या आधार",
    "connect_digilocker": "डिजिलॉकर से कनेक्ट करें",
    "new_user_register": "नए उपयोगकर्ता?",
    "register_here": "यहाँ पंजीकरण करें",
    "help_desk": "सहायता केंद्र",
    "security_faq": "सुरक्षा FAQ",
    "gov_topbar_text": "भारत सरकार  |  इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय",
    "national_id_portal": "राष्ट्रीय पहचान सत्यापन पोर्टल",
    "one_identity": "एक पहचान,",
    "infinite_possibilities": "अनंत संभावनाएँ।",
    "highly_secure": "अत्यधिक सुरक्षित",
    "highly_secure_desc": "सभी सरकारी पोर्टलों के लिए एंड-टू-एंड एन्क्रिप्टेड प्रमाणीकरण।",
    "digilocker_integration": "डिजिलॉकर एकीकरण",
    "digilocker_integration_desc": "लॉगिन करते ही अपने डिजिटल दस्तावेज़ तुरंत एक्सेस करें।",
    "paperless_verification": "पेपरलेस सत्यापन",
    "paperless_verification_desc": "विभागों में अपनी पहचान सहजता से सत्यापित करें।",
    "cert_badge_text": "प्रमाणित GIGW 3.0 और STQC अनुपालन आर्किटेक्चर",
    "digilocker_info": "आपको आधार-लिंक्ड क्रेडेंशियल्स से प्रमाणित करने के लिए सुरक्षित रूप से डिजिलॉकर प्लेटफ़ॉर्म पर रीडायरेक्ट किया जाएगा। आपका डेटा DPDP अधिनियम, 2023 के तहत सुरक्षित है।",
    "footer_copy_login": "© 2025 इलेक्ट्रॉनिक्स और सूचना प्रौद्योगिकी मंत्रालय, भारत सरकार।",
    "footer_motto": "सुरक्षित • पारदर्शी • संप्रभु",
    "valid_mobile_error": "कृपया एक मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।",
    "otp_sent_demo": "+91 {number} पर OTP भेजा गया। (डेमो: कोई भी 6 अंकों का कोड दर्ज करें)",
    "otp_resent_demo": "OTP पुनः भेजा गया। (डेमो: कोई भी 6 अंकों का कोड दर्ज करें)",
    "complete_otp_error": "कृपया पूरा 6 अंकों का OTP दर्ज करें।",
    "otp_verified_redirect": "OTP सत्यापित! डैशबोर्ड पर रीडायरेक्ट हो रहा है…",
    "enter_linked_error": "कृपया अपना लिंक किया गया मोबाइल या आधार नंबर दर्ज करें।",
    "connecting_digilocker": "डिजिलॉकर से कनेक्ट हो रहा है… (डेमो: डैशबोर्ड पर रीडायरेक्ट)",
    "resend": "पुनः भेजें",
    "resend_otp": "OTP पुनः भेजें",
    "dark_mode": "डार्क मोड",
    "light_mode": "लाइट मोड",
  }
};

/**
 * Translation helper — returns the translated string for the current language.
 * @param {string} key - The i18n key
 * @returns {string}
 */
window.t = function (key) {
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
};

/**
 * Apply translations to all elements with data-i18n and data-i18n-placeholder attributes.
 * @param {string} lang - 'en' or 'hi'
 */
window.applyTranslations = function (lang) {
  window.currentLang = lang;
  document.documentElement.lang = lang;

  // Translate textContent
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    var text = TRANSLATIONS[lang][key];
    if (text !== undefined) {
      // For inputs with value, set value; for others set textContent
      if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'hidden') {
        el.value = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Translate placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var text = TRANSLATIONS[lang][key];
    if (text !== undefined) {
      el.placeholder = text;
    }
  });
};
