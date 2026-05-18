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
        onboarding: 'Onboarding',
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
        confirmPassword: 'Confirm Password',
        signIn: 'Sign in',
        forgotPassword: 'Forgot password?',
        resetPassword: 'Reset Password',
        sendResetLink: 'Send reset link',
        backToLogin: 'Back to login',
        newPassword: 'New Password',
        updatePassword: 'Update Password',
        invalidCredentials: 'Email or password is incorrect.',
        inactiveAccount: 'Your account is currently inactive.',
        checkEmail: 'If your email is in our system, you will receive a reset link shortly.',
        resetSuccess: 'Successfully reset! Redirecting to login...'
      },
      admin: {
        users: 'Users',
        emailLogs: 'Sent Emails',
        searchRecipient: 'Search recipient...',
        searchSubject: 'Search subject...',
        dateFrom: 'Date From',
        dateTo: 'Date To',
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
        contactEmailExists: 'A contact with this email already exists.',
        icoExists: 'Company with this ID already exists.',
        passwordMismatch: 'Passwords do not match.',
        generalError: 'An error occurred. Please check the fields below.',
        requiredField: 'This field is required.',
        emailOrPhoneRequired: 'Email or phone is required.',
        kanban: {
          missingHunter: 'First you must assign a hunter before moving to the next stage.',
          missingAttributes: 'First you must fill in the attributes (Lead source, E-commerce platform, Estimated monthly parcels > 0) before moving to the next stage.',
          missingCloser: 'First you must assign a closer before moving to the next stage.',
          missingCloserAttributes: 'First you must fill in the product attributes (Delivery countries, items, weight, volume) and add a pricing offer before moving to the next stage.',
          missingFarmer: 'First you must assign a farmer before moving to the next stage.'
        }
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        add: 'Add',
        edit: 'Edit',
        language: 'Language',
        user: 'Acting User',
        error: 'Error',
        contacts: 'Contacts',
        activities: 'Activities',
        history: 'History',
        addContact: 'Add Contact',
        newContact: 'New Contact',
        editContact: 'Edit Contact',
        activeOnly: 'Active only',
        showAll: 'Show all',
        search: 'Search...',
        advancingToContracting: 'The deal was automatically moved to the Contracting stage.'
      },
      deal: {
        attributes: {
          leadSource: 'Lead source',
          ecommercePlatform: 'E-commerce platform',
          estimatedParcels: 'Estimated monthly parcels',
          deliveryCountries: 'Delivery countries',
          averageItems: 'Average items per order',
          averageWeight: 'Average parcel weight (kg)',
          averageVolume: 'Average parcel volume (cm³)',
          pricingOffers: 'Pricing offers',
          addOffer: 'Add offer',
          download: 'Download',
          addedBy: 'Added by',
          noOffers: 'No pricing offers added yet.',
          enterValidInteger: 'Please enter a valid integer greater than zero.',
          enterValidNumber: 'Please enter a valid number greater than zero.',
          notSelected: 'Not selected',
          title: 'Attributes'
        }
      },
      validation: {
        emailRequired: 'Email is required',
        emailInvalid: 'Invalid email format',
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
        onboarding: 'Onboarding',
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
        confirmPassword: 'Potvrzení hesla',
        signIn: 'Přihlásit se',
        forgotPassword: 'Zapomenuté heslo?',
        resetPassword: 'Obnovit heslo',
        sendResetLink: 'Odeslat odkaz',
        backToLogin: 'Zpět na přihlášení',
        newPassword: 'Nové heslo',
        updatePassword: 'Aktualizovat heslo',
        invalidCredentials: 'Email nebo heslo je nesprávné.',
        inactiveAccount: 'Váš účet je nyní neaktivní.',
        checkEmail: 'Pokud je váš email v našem systému, brzy obdržíte odkaz k obnovení.',
        resetSuccess: 'Úspěšně obnoveno! Přesměrovávám na přihlášení...'
      },
      admin: {
        users: 'Uživatelé',
        emailLogs: 'Odeslané emaily',
        searchRecipient: 'Hledat příjemce...',
        searchSubject: 'Hledat předmět...',
        dateFrom: 'Datum od',
        dateTo: 'Datum do',
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
        contactEmailExists: 'Kontakt s tímto emailem již existuje.',
        icoExists: 'Společnost s tímto IČO již existuje.',
        passwordMismatch: 'Hesla se neshodují.',
        generalError: 'Vyskytla se chyba. Zkontrolujte prosím pole níže.',
        requiredField: 'Toto pole je povinné.',
        emailOrPhoneRequired: 'Zadejte email nebo telefon.',
        kanban: {
          missingHunter: 'Prvně musíte přiřadit huntera (hunter), než můžete posunout do dalšího stavu.',
          missingAttributes: 'Prvně musíte vyplnit atributy (Zdroj leadu, e-commerce platforma, Odhadovaný měsíční počet balíků větší jak 0) než můžete posunout do dalšího stavu.',
          missingCloser: 'Prvně musíte přiřadit closera (closer), než můžete posunout do dalšího stavu.',
          missingCloserAttributes: 'Prvně musíte vyplnit atributy produktu (země doručení, počet ks, hmotnost, objem balíku) a přidat cenovou nabídku, než můžete posunout do dalšího stavu.',
          missingFarmer: 'Prvně musíte přiřadit farmera (farmer), než můžete posunout do dalšího stavu.'
        }
      },
      common: {
        save: 'Uložit',
        cancel: 'Zrušit',
        add: 'Přidat',
        edit: 'Upravit',
        language: 'Jazyk',
        user: 'Zastupující Uživatel',
        error: 'Chyba',
        contacts: 'Kontakty',
        activities: 'Aktivity',
        history: 'Historie',
        addContact: 'Přidat kontakt',
        newContact: 'Nový kontakt',
        editContact: 'Upravit kontakt',
        activeOnly: 'Pouze aktivní',
        showAll: 'Zobrazit všechny',
        search: 'Hledat...',
        advancingToContracting: 'Příležitost byla automaticky posunuta do fáze Contracting.'
      },
      deal: {
        attributes: {
          leadSource: 'Zdroj leadu',
          ecommercePlatform: 'E-commerce platforma',
          estimatedParcels: 'Odhadovaný měsíční počet balíků',
          deliveryCountries: 'Země doručení',
          averageItems: 'Průměrný počet ks v objednávce',
          averageWeight: 'Průměrná hmotnost zásilky (kg)',
          averageVolume: 'Průměrný objem balíku (cm³)',
          pricingOffers: 'Cenové nabídky',
          addOffer: 'Přidat nabídku',
          download: 'Stáhnout',
          addedBy: 'Přidal',
          noOffers: 'Zatím nebyly přidány žádné cenové nabídky.',
          enterValidInteger: 'Zadejte prosím platné celé číslo větší než nula.',
          enterValidNumber: 'Zadejte prosím platné číslo větší než nula.',
          notSelected: 'Nevybráno',
          title: 'Atributy'
        }
      },
      validation: {
        emailRequired: 'Email musí být zadán',
        emailInvalid: 'Neplatný formát emailu',
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
