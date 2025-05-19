const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { crawler } = require('./crawler');

/**
 * Générateur de Sitemap dynamique pour UniversLivebox.com
 * Ce script utilise le crawler pour récupérer le contenu du site
 * puis génère un sitemap standard et un sitemap Google News.
 */

// Configuration principale
const CONFIG = {
  nomSite: 'UniversLivebox',
  domaine: 'https://universlivebox.com',
  langue: 'fr',
  miseAJour: new Date().toISOString(),
  dossierSortie: './sitemaps',
  urlsParFichier: 50000, // Limite recommandée par Google pour sitemap standard
  urlsParFichierNews: 1000, // Limite recommandée par Google pour sitemap news
  maxArticlesNews: 1000, // Maximum d'articles pour Google News
  formatDateNews: true, // Ajouter l'heure à la date pour Google News
  genererSitemapTags: true, // Générer des sitemaps par tag
  minArticlesParTag: 3, // Nombre minimum d'articles pour générer un sitemap de tag
  respecterLimite48h: false, // Si true, respecte strictement la règle des 48h pour Google News
  forcerSitemapNews: true // Générer un sitemap news même s'il n'y a pas d'articles récents
};

// Pages statiques importantes
const PAGES_STATIQUES = [
  {
    url: '/',
    changefreq: 'daily',
    priority: '1.0'
  },
  {
    url: '/orange',
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/free',
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/bouygues',
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/sfr',
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/fibre',
    changefreq: 'daily',
    priority: '0.9'
  },
  {
    url: '/xgs-pon',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/4g-5g',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/cybersecurite',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/tutos',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/detente',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/bons-plans',
    changefreq: 'weekly',
    priority: '0.8'
  },
  {
    url: '/mentions-legales',
    changefreq: 'yearly',
    priority: '0.3'
  },
  {
    url: '/protection-donnees',
    changefreq: 'yearly',
    priority: '0.3'
  }
];

/**
 * Regroupe les articles par tag
 * @param {Array} articles Liste des articles
 * @returns {Object} Articles regroupés par tag
 */
function regrouperArticlesParTag(articles) {
  const tagsMap = {};
  
  articles.forEach(article => {
    if (article.tags && article.tags.length) {
      article.tags.forEach(tag => {
        // Normaliser le nom du tag
        const tagNormalise = tag.replace(/\s+/g, '-').replace(/[^\w-]/g, '').toLowerCase();
        
        if (!tagsMap[tagNormalise]) {
          tagsMap[tagNormalise] = {
            nom: tag,
            articles: []
          };
        }
        
        tagsMap[tagNormalise].articles.push(article);
      });
    }
  });
  
  return tagsMap;
}

/**
 * Génère la structure d'un sitemap standard
 * @param {Array} articles Liste des articles
 * @returns {Object} Structure XML du sitemap standard
 */
function genererSitemapStandard(articles) {
  // Structure XML conforme aux spécifications Google
  const urlset = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"
    },
    url: []
  };

  // Ajouter les pages statiques
  PAGES_STATIQUES.forEach(page => {
    urlset.url.push({
      loc: `${CONFIG.domaine}${page.url}`,
      lastmod: CONFIG.miseAJour,
      changefreq: page.changefreq,
      priority: page.priority
    });
  });

  // Ajouter les articles
  articles.forEach(article => {
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
 * Génère la structure d'un sitemap pour un tag spécifique
 * @param {Array} articles Liste des articles associés au tag
 * @param {String} tag Nom du tag
 * @returns {Object} Structure XML du sitemap pour ce tag
 */
function genererSitemapTag(articles, tag) {
  // Structure XML conforme aux spécifications Google
  const urlset = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"
    },
    url: []
  };

  // Ajouter la page du tag si elle existe
  urlset.url.push({
    loc: `${CONFIG.domaine}/tag/${tag.replace(/\s+/g, '-').toLowerCase()}`,
    lastmod: CONFIG.miseAJour,
    changefreq: 'weekly',
    priority: '0.7'
  });

  // Ajouter les articles de ce tag
  articles.forEach(article => {
    urlset.url.push({
      loc: `${CONFIG.domaine}${article.url}`,
      lastmod: article.date,
      changefreq: 'monthly',
      priority: '0.5'
    });
  });

  return { urlset };
}

/**
 * Formate une date au format ISO8601 complet pour Google News
 * @param {String} dateStr Date au format YYYY-MM-DD
 * @returns {String} Date au format ISO8601 avec heure
 */
function formaterDateNews(dateStr) {
  // Si la date est déjà au format complet, la retourner
  if (dateStr.includes('T')) {
    return dateStr;
  }
  
  // Sinon, ajouter l'heure (midi par défaut)
  return `${dateStr}T12:00:00+00:00`;
}

/**
 * Génère la structure d'un sitemap Google News
 * @param {Array} articles Liste des articles
 * @returns {Object} Structure XML du sitemap Google News
 */
function genererSitemapNews(articles) {
  // Structure XML conforme aux spécifications Google News
  const urlset = {
    $: {
      xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
      "xmlns:news": "http://www.google.com/schemas/sitemap-news/0.9"
    },
    url: []
  };

  // Filtre pour les articles récents (moins de 48h pour Google News)
  const dateLimite = new Date();
  dateLimite.setDate(dateLimite.getDate() - 2);
  
  let articlesNews = [];
  
  if (CONFIG.respecterLimite48h) {
    // Uniquement les articles des dernières 48 heures
    articlesNews = articles.filter(article => {
      const dateArticle = new Date(article.date);
      return dateArticle >= dateLimite;
    });
  } else {
    // Prendre les articles les plus récents d'abord, jusqu'à maxArticlesNews
    articlesNews = [...articles].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Tri décroissant par date
    });
  }
  
  // Limiter le nombre d'articles selon les recommandations de Google
  articlesNews = articlesNews.slice(0, CONFIG.maxArticlesNews);
  
  console.log(`Inclusion de ${articlesNews.length} articles dans le sitemap Google News`);
  
  // Si aucun article récent mais qu'on doit forcer la génération
  if (articlesNews.length === 0 && CONFIG.forcerSitemapNews) {
    console.log("Pas d'articles récents, inclusion des articles plus anciens pour Google News");
    articlesNews = articles.slice(0, CONFIG.maxArticlesNews);
  }
  
  articlesNews.forEach(article => {
    const datePublication = CONFIG.formatDateNews ? 
      formaterDateNews(article.date) : article.date;
      
    const newsItem = {
      loc: `${CONFIG.domaine}${article.url}`,
      "news:news": {
        "news:publication": {
          "news:name": CONFIG.nomSite,
          "news:language": CONFIG.langue
        },
        "news:publication_date": datePublication,
        "news:title": article.titre
      }
    };
    
    // Préparer les keywords à partir des tags et de l'auteur
    let keywords = [];
    
    // Ajouter les tags aux keywords s'ils sont disponibles
    if (article.tags && article.tags.length > 0) {
      keywords = [...article.tags];
    }
    
    // Ajouter l'auteur aux keywords s'il est disponible et différent de la valeur par défaut
    if (article.auteur && article.auteur !== "UniversLivebox") {
      // Ajouter l'auteur comme un keyword
      keywords.push(`auteur:${article.auteur}`);
      
      // Ajouter les balises de genres pour les articles de blog ou communiqués de presse
      newsItem["news:news"]["news:genres"] = "PressRelease, Blog";
    }
    
    // Ajouter les keywords s'il y en a
    if (keywords.length > 0) {
      newsItem["news:news"]["news:keywords"] = keywords.join(', ');
    }
    
    urlset.url.push(newsItem);
  });

  return { urlset };
}

/**
 * Divise les articles en plusieurs sitemaps si nécessaire
 * @param {Array} articles Liste des articles
 * @param {Number} maxParFichier Maximum d'articles par fichier
 * @param {Function} generateur Fonction de génération du sitemap
 * @param {String} prefixe Préfixe du nom de fichier
 * @returns {Array} Liste des fichiers sitemap générés
 */
function genererMultiplesSitemaps(articles, maxParFichier, generateur, prefixe, tagParam = null) {
  const fichiers = [];
  
  // Si peu d'articles, générer un seul fichier
  if (articles.length <= maxParFichier) {
    const sitemap = tagParam ? generateur(articles, tagParam) : generateur(articles);
    const fichier = path.join(CONFIG.dossierSortie, `${prefixe}.xml`);
    ecrireFichierXML(sitemap, fichier);
    fichiers.push(`${prefixe}.xml`);
    return fichiers;
  }
  
  // Sinon, diviser en plusieurs fichiers
  const nbFichiers = Math.ceil(articles.length / maxParFichier);
  
  for (let i = 0; i < nbFichiers; i++) {
    const debut = i * maxParFichier;
    const fin = Math.min(debut + maxParFichier, articles.length);
    const articlesPartie = articles.slice(debut, fin);
    
    const sitemap = tagParam ? generateur(articlesPartie, tagParam) : generateur(articlesPartie);
    const nomFichier = `${prefixe}${i + 1}.xml`;
    const fichier = path.join(CONFIG.dossierSortie, nomFichier);
    
    ecrireFichierXML(sitemap, fichier);
    fichiers.push(nomFichier);
  }
  
  return fichiers;
}

/**
 * Génère un index de sitemap
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
      loc: `${CONFIG.domaine}/sitemaps/${fichier}`,
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
 * Fonction principale qui récupère les données puis génère les sitemaps
 */
async function genererSitemapsDynamiques() {
  console.log('Début du processus de génération des sitemaps pour UniversLivebox...');
  
  try {
    // Récupérer les articles via le crawler
    console.log('Récupération des articles via le crawler...');
    const articles = await crawler();
    
    if (articles.length === 0) {
      console.error('Aucun article trouvé. La génération des sitemaps est annulée.');
      return;
    }
    
    console.log(`${articles.length} articles récupérés avec succès.`);
    
    const fichiersSitemap = [];
    
    // Générer les sitemaps standards (avec pagination si nécessaire)
    console.log('Génération des sitemaps standards...');
    const fichiersStandard = genererMultiplesSitemaps(
      articles, 
      CONFIG.urlsParFichier, 
      genererSitemapStandard, 
      'sitemap'
    );
    fichiersSitemap.push(...fichiersStandard);
    
    // Générer les sitemaps Google News même si pas d'articles récents
    console.log('Génération des sitemaps Google News...');
    // Forcer la génération d'au moins un fichier sitemap news même si vide
    const fichiersNews = genererMultiplesSitemaps(
      articles.length > 0 ? articles : [{ 
        titre: 'Article exemple', 
        url: '/', 
        date: new Date().toISOString().split('T')[0] 
      }], 
      CONFIG.urlsParFichierNews, 
      genererSitemapNews, 
      'sitemap-news'
    );
    fichiersSitemap.push(...fichiersNews);
    
    // Générer les sitemaps par tag si configuré
    if (CONFIG.genererSitemapTags) {
      console.log('Analyse des tags pour génération de sitemaps par tag...');
      const articlesParTag = regrouperArticlesParTag(articles);
      
      // Calculer les statistiques des tags
      const statsTagsMsg = Object.keys(articlesParTag).map(tag => 
        `${articlesParTag[tag].nom}: ${articlesParTag[tag].articles.length} articles`
      ).join('\n');
      console.log(`Tags trouvés:\n${statsTagsMsg}`);
      
      // Générer un sitemap pour chaque tag avec suffisamment d'articles
      for (const [tagKey, tagData] of Object.entries(articlesParTag)) {
        if (tagData.articles.length >= CONFIG.minArticlesParTag) {
          console.log(`Génération du sitemap pour le tag ${tagData.nom} (${tagData.articles.length} articles)...`);
          const fichiersTag = genererMultiplesSitemaps(
            tagData.articles,
            CONFIG.urlsParFichier,
            genererSitemapTag,
            `sitemap-tag-${tagKey}`,
            tagKey
          );
          fichiersSitemap.push(...fichiersTag);
        }
      }
    }
    
    // Générer et écrire l'index de sitemap
    console.log('Génération de l\'index de sitemap...');
    const sitemapIndex = genererSitemapIndex(fichiersSitemap);
    const fichierIndex = path.join(CONFIG.dossierSortie, 'sitemap-index.xml');
    ecrireFichierXML(sitemapIndex, fichierIndex);
    
    // Générer un robot.txt avec référence au sitemap
    console.log('Génération du fichier robots.txt...');
    const robotsTxt = `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${CONFIG.domaine}/sitemaps/sitemap-index.xml
`;
    fs.writeFileSync(path.join(CONFIG.dossierSortie, 'robots.txt'), robotsTxt);
    
    console.log('Génération des sitemaps terminée avec succès!');
  } catch (error) {
    console.error(`Erreur lors de la génération des sitemaps: ${error.message}`);
  }
}

// Exécuter le générateur
genererSitemapsDynamiques(); 