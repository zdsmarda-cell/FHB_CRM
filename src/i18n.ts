import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appName: 'FHB CRM',
      roles: {
        hunter: 'Hunter',
        closer: 'Closer',
        farmer: 'Farmer',
        cso: 'CSO',
        administrator: 'Administrator'
      },
      stages: {
        lead_opportunity: 'Lead & Opportunity',
        discovery_proposal: 'Discovery & Proposal',
        contracting: 'Contracting',
        farming: 'Farming',
        lost: 'Lost'
      },
      menu: {
        board: 'Kanban Board',
        admin: 'Admin Panel',
        newDeal: 'New Deal'
      },
      fields: {
        ico: 'Company ID (IČO)',
        companyName: 'Company Name',
        address: 'Address',
        region: 'Region',
        segment: 'Segment',
        email: 'Email',
        phone: 'Phone',
        urls: 'Websites',
        contacts: 'Contacts'
      },
      auth: {
        login: 'Login',
        logout: 'Logout',
        email: 'Email address',
        password: 'Password',
        signIn: 'Sign in',
        forgotPassword: 'Forgot password?',
        resetPassword: 'Reset Password',
        sendResetLink: 'Send reset link',
        backToLogin: 'Back to login',
        newPassword: 'New Password',
        updatePassword: 'Update Password',
        invalidCredentials: 'Email or password is incorrect.',
        inactiveAccount: 'Your account is currently inactive.',
        checkEmail: 'If your email is in our system, you will receive a reset link shortly.'
      },
      admin: {
        users: 'Users',
        addUser: 'Add User',
        editUser: 'Edit User',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        name: 'Full Name',
        role: 'Role',
        manager: 'Manager'
      },
      errors: {
        emailExists: 'This email already exists in the system.',
        icoExists: 'Company with this ID already exists.',
        passwordMismatch: 'Passwords do not match.',
        generalError: 'An error occurred. Please check the fields below.',
        requiredField: 'This field is required.',
        emailOrPhoneRequired: 'Email or phone is required.'
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        language: 'Language',
        user: 'Acting User'
      },
      validation: {
        emailRequired: 'Email is required',
        passwordRequired: 'Password is required'
      }
    }
  },
  cs: {
    translation: {
      appName: 'FHB CRM',
      roles: {
        hunter: 'Hunter',
        closer: 'Closer',
        farmer: 'Farmer',
        cso: 'CSO',
        administrator: 'Administrátor'
      },
      stages: {
        lead_opportunity: 'Lead & Oportunita',
        discovery_proposal: 'Discovery & Ponuka',
        contracting: 'Contracting',
        farming: 'Farming',
        lost: 'Lost'
      },
      menu: {
        board: 'Kanban Nástěnka',
        admin: 'Admin Panel',
        newDeal: 'Nová Příležitost'
      },
      fields: {
        ico: 'IČO',
        companyName: 'Název společnosti',
        address: 'Adresa',
        region: 'Region',
        segment: 'Segment',
        email: 'Email',
        phone: 'Telefon',
        urls: 'Webové Stránky',
        contacts: 'Kontakty'
      },
      auth: {
        login: 'Přihlášení',
        logout: 'Odhlášení',
        email: 'Emailová adresa',
        password: 'Heslo',
        signIn: 'Přihlásit se',
        forgotPassword: 'Zapomenuté heslo?',
        resetPassword: 'Obnovit heslo',
        sendResetLink: 'Odeslat odkaz',
        backToLogin: 'Zpět na přihlášení',
        newPassword: 'Nové heslo',
        updatePassword: 'Aktualizovat heslo',
        invalidCredentials: 'Email nebo heslo je nesprávné.',
        inactiveAccount: 'Váš účet je nyní neaktivní.',
        checkEmail: 'Pokud je váš email v našem systému, brzy obdržíte odkaz k obnovení.'
      },
      admin: {
        users: 'Uživatelé',
        addUser: 'Přidat Uživatele',
        editUser: 'Upravit Uživatele',
        status: 'Stav',
        active: 'Aktivní',
        inactive: 'Neaktivní',
        name: 'Celé Jméno',
        role: 'Role',
        manager: 'Vedoucí'
      },
      errors: {
        emailExists: 'Zadaný email již v systému existuje.',
        icoExists: 'Společnost s tímto IČO již existuje.',
        passwordMismatch: 'Hesla se neshodují.',
        generalError: 'Vyskytla se chyba. Zkontrolujte prosím pole níže.',
        requiredField: 'Toto pole je povinné.',
        emailOrPhoneRequired: 'Zadejte email nebo telefon.'
      },
      common: {
        save: 'Uložit',
        cancel: 'Zrušit',
        add: 'Přidat',
        language: 'Jazyk',
        user: 'Zastupující Uživatel'
      },
      validation: {
        emailRequired: 'Email musí být zadán',
        passwordRequired: 'Heslo musí být zadáno'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'cs', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
