const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

/**
 * Générateur de Sitemap pour UniversLivebox.com
 * Ce script génère à la fois un sitemap standard et un sitemap Google News
 * selon les spécifications officielles de Google.
 */

// Configuration principale
const CONFIG = {
  nomSite: 'UniversLivebox',
  domaine: 'https://universlivebox.com',
  langue: 'fr',
  miseAJour: new Date().toISOString(),
  dossierSortie: './sitemaps',
  urlsParFichier: 50000 // Limite recommandée par Google
};

// Catégories du site
const CATEGORIES = [
  'orange', 'free', 'bouygues', 'sfr', 'fibre', 'xgs-pon', '4g-5g', 'cybersecurite', 
  'tutos', 'detente', 'bons-plans', 'livebox', 'tv', 'ios', 'smart-tv', 'netflix'
];

/**
 * Structure des articles extraite du site
 * Dans un cas réel, ces données seraient extraites dynamiquement via web scraping ou API
 */
const ARTICLES = [
  {
    titre: "France 2 UHD débarque sur le canal 2 chez Orange",
    url: "/france-2-uhd-canal-2-orange",
    date: "2025-05-17",
    categorie: "tv"
  },
  {
    titre: "Une Smart TV Samsung 43\" pour 19€ ?! Merci Orange",
    url: "/smart-tv-samsung-43-19-euros-orange",
    date: "2025-05-17",
    categorie: "smart-tv"
  },
  {
    titre: "iOS 18.5 est là : pas de révolution, mais plein de petites choses bien utiles !",
    url: "/ios-18-5-nouveautes-utiles",
    date: "2025-05-13",
    categorie: "ios"
  },
  {
    titre: "NOS, moteur de la culture pop et digitale de la jeunesse portugaise",
    url: "/nos-culture-pop-digitale-jeunesse-portugaise",
    date: "2025-05-06",
    categorie: "fibre"
  },
  {
    titre: "Netflix augmente (encore) ses prix, heureusement Orange est là avec ses remises SVOD !",
    url: "/netflix-augmentation-prix-orange-remises-svod",
    date: "2025-05-04",
    categorie: "netflix"
  },
  {
    titre: "Livebox S : une installation et réparation fibre simplifiée grâce au crayon optique intégré",
    url: "/livebox-s-installation-reparation-fibre-crayon-optique",
    date: "2025-05-04",
    categorie: "livebox"
  },
  {
    titre: "Wifi 7 : Orange peut remettre le 6Ghz \"à tout moment\"",
    url: "/wifi-7-orange-6ghz",
    date: "2025-05-04",
    categorie: "orange"
  },
  {
    titre: "Starlink offre son kit satellite… à 0 € ! Mais avec un petit \"twist\"",
    url: "/starlink-kit-satellite-gratuit-twist",
    date: "2025-05-02",
    categorie: "fibre"
  }
  // Dans un cas réel, cette liste serait beaucoup plus longue et générée dynamiquement
];

/**
 * Génère la structure d'un sitemap standard
 * @returns {Object} Structure XML du sitemap standard
 */
function genererSitemapStandard() {
  // Structure XML conforme aux spécifications Google
  const urlset = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"
    },
    url: []
  };

  // Ajouter la page d'accueil
  urlset.url.push({
    loc: CONFIG.domaine,
    lastmod: CONFIG.miseAJour,
    changefreq: 'daily',
    priority: '1.0'
  });

  // Ajouter les pages de catégories
  CATEGORIES.forEach(categorie => {
    urlset.url.push({
      loc: `${CONFIG.domaine}/${categorie}`,
      lastmod: CONFIG.miseAJour,
      changefreq: 'weekly',
      priority: '0.8'
    });
  });

  // Ajouter les articles
  ARTICLES.forEach(article => {
    urlset.url.push({
      loc: `${CONFIG.domaine}${article.url}`,
      lastmod: article.date,
      changefreq: 'monthly',
      priority: '0.6'
    });
  });

  return { urlset };
}

/**
 * Génère la structure d'un sitemap Google News
 * @returns {Object} Structure XML du sitemap Google News
 */
function genererSitemapNews() {
  // Structure XML conforme aux spécifications Google News
  const urlset = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
      "xmlns:news": "http://www.google.com/schemas/sitemap-news/0.9"
    },
    url: []
  };

  // Ajouter uniquement les articles récents (moins de 48h pour Google News)
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() - 2);
  
  ARTICLES.forEach(article => {
    const dateArticle = new Date(article.date);
    
    // Ne pas inclure les articles trop anciens pour Google News
    if (dateArticle >= dateLimite) {
      urlset.url.push({
        loc: `${CONFIG.domaine}${article.url}`,
        "news:news": {
          "news:publication": {
            "news:name": CONFIG.nomSite,
            "news:language": CONFIG.langue
          },
          "news:publication_date": article.date,
          "news:title": article.titre
        }
      });
    }
  });

  return { urlset };
}

/**
 * Génère un index de sitemap si nécessaire
 * @param {Array} fichiersSitemap Liste des fichiers sitemap générés
 * @returns {Object} Structure XML de l'index sitemap
 */
function genererSitemapIndex(fichiersSitemap) {
  const sitemapindex = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"
    },
    sitemap: []
  };

  fichiersSitemap.forEach(fichier => {
    sitemapindex.sitemap.push({
      loc: `${CONFIG.domaine}/${fichier}`,
      lastmod: CONFIG.miseAJour
    });
  });

  return { sitemapindex };
}

/**
 * Écrit un fichier XML à partir d'une structure d'objet
 * @param {Object} donnees Structure de données à convertir en XML
 * @param {String} cheminFichier Chemin du fichier de sortie
 */
function ecrireFichierXML(donnees, cheminFichier) {
  // Assurer que le dossier de sortie existe
  if (!fs.existsSync(CONFIG.dossierSortie)) {
    fs.mkdirSync(CONFIG.dossierSortie, { recursive: true });
  }
  
  const builder = new xml2js.Builder({ 
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });
  
  const xml = builder.buildObject(donnees);
  fs.writeFileSync(cheminFichier, xml);
  console.log(`Fichier généré: ${cheminFichier}`);
}

/**
 * Fonction principale qui génère tous les sitemaps
 */
function genererSitemaps() {
  console.log('Début de la génération des sitemaps pour UniversLivebox...');
  
  const fichiersSitemap = [];
  
  // Générer et écrire le sitemap standard
  const sitemapStandard = genererSitemapStandard();
  const fichierStandard = path.join(CONFIG.dossierSortie, 'sitemap.xml');
  ecrireFichierXML(sitemapStandard, fichierStandard);
  fichiersSitemap.push('sitemap.xml');
  
  // Générer et écrire le sitemap Google News
  const sitemapNews = genererSitemapNews();
  const fichierNews = path.join(CONFIG.dossierSortie, 'sitemap-news.xml');
  ecrireFichierXML(sitemapNews, fichierNews);
  fichiersSitemap.push('sitemap-news.xml');
  
  // Générer et écrire l'index de sitemap
  const sitemapIndex = genererSitemapIndex(fichiersSitemap);
  const fichierIndex = path.join(CONFIG.dossierSortie, 'sitemap-index.xml');
  ecrireFichierXML(sitemapIndex, fichierIndex);
  
  console.log('Génération des sitemaps terminée!');
}

// Exécuter le générateur
genererSitemaps(); 