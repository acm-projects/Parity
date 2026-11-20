// Generated from Saltmeadow's answer key (BUGS.md). The exact fixes Parity suggests on the Saltmeadow demo site.
// Each one deletes a single line in saltmeadow/public/css/styles.css when committed.

export interface SmFix {
  id: string;
  page: string; // "all" = every page
  area: string;
  title: string;
  selector: string; // the CSS rule in styles.css
  property: string;
  wrong: string; // what the site has now
  correct: string; // the Figma value
}

export const SM_FIXES: SmFix[] = [
  {
    "id": "S01",
    "page": "all",
    "area": "header",
    "title": "Logo text color",
    "selector": ".site-header .logo",
    "property": "color",
    "wrong": "#D62828",
    "correct": "#4D6A7A"
  },
  {
    "id": "S02",
    "page": "all",
    "area": "header",
    "title": "Cart pill background",
    "selector": ".cart-pill",
    "property": "background-color",
    "wrong": "#E9BFA0",
    "correct": "#C7D7E5"
  },
  {
    "id": "S03",
    "page": "all",
    "area": "header",
    "title": "Active nav underline color",
    "selector": ".nav a[aria-current]",
    "property": "border-bottom-color",
    "wrong": "#D98B6A",
    "correct": "#A7B69A"
  },
  {
    "id": "S04",
    "page": "all",
    "area": "header",
    "title": "Active nav underline thickness",
    "selector": ".nav a[aria-current]",
    "property": "border-bottom-width",
    "wrong": "4px",
    "correct": "2px"
  },
  {
    "id": "S05",
    "page": "all",
    "area": "footer",
    "title": "Footer background",
    "selector": ".site-footer",
    "property": "background-color",
    "wrong": "#6B7F6B",
    "correct": "#4D6A7A"
  },
  {
    "id": "S06",
    "page": "home",
    "area": "hero",
    "title": "Big arch color",
    "selector": ".ha-arch",
    "property": "color",
    "wrong": "#D62828",
    "correct": "#C7D7E5"
  },
  {
    "id": "S07",
    "page": "home",
    "area": "hero",
    "title": "Flower shape color",
    "selector": ".ha-flower",
    "property": "color",
    "wrong": "#FFC300",
    "correct": "#A7B69A"
  },
  {
    "id": "S08",
    "page": "home",
    "area": "hero",
    "title": "Eyebrow text color",
    "selector": ".hero .eyebrow",
    "property": "color",
    "wrong": "#FF3D7F",
    "correct": "#6B7F6B"
  },
  {
    "id": "S09",
    "page": "home",
    "area": "hero",
    "title": "Heading font",
    "selector": ".hero h1",
    "property": "font-family",
    "wrong": "'Courier New', Courier, monospace",
    "correct": "'Fraunces', Georgia, serif"
  },
  {
    "id": "S10",
    "page": "home",
    "area": "hero",
    "title": "Heading size",
    "selector": ".hero h1",
    "property": "font-size",
    "wrong": "44px",
    "correct": "64px"
  },
  {
    "id": "S11",
    "page": "home",
    "area": "hero",
    "title": "Heading color",
    "selector": ".hero h1",
    "property": "color",
    "wrong": "#D62828",
    "correct": "#4D6A7A"
  },
  {
    "id": "S12",
    "page": "home",
    "area": "hero",
    "title": "Intro text size",
    "selector": ".hero .lead",
    "property": "font-size",
    "wrong": "14px",
    "correct": "19px"
  },
  {
    "id": "S13",
    "page": "home",
    "area": "hero",
    "title": "“Shop plants” button color",
    "selector": ".hero .btn-primary",
    "property": "background-color",
    "wrong": "#D62828",
    "correct": "#6B7F6B"
  },
  {
    "id": "S14",
    "page": "home",
    "area": "hero",
    "title": "Space between the buttons",
    "selector": ".hero-actions",
    "property": "gap",
    "wrong": "40px",
    "correct": "14px"
  },
  {
    "id": "S15",
    "page": "home",
    "area": "hero",
    "title": "Space above the buttons",
    "selector": ".hero-actions",
    "property": "margin-top",
    "wrong": "12px",
    "correct": "32px"
  },
  {
    "id": "S16",
    "page": "home",
    "area": "hero",
    "title": "“Our story” button corners",
    "selector": ".hero .btn-secondary",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "999px"
  },
  {
    "id": "S17",
    "page": "home",
    "area": "features",
    "title": "Feature title font",
    "selector": ".feature-card h3",
    "property": "font-family",
    "wrong": "'Courier New', Courier, monospace",
    "correct": "'Fraunces', Georgia, serif"
  },
  {
    "id": "S18",
    "page": "home",
    "area": "features",
    "title": "“Peat-free pots” card corners",
    "selector": ".features-grid .feature-card:nth-child(2)",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "24px"
  },
  {
    "id": "S19",
    "page": "home",
    "area": "favourites",
    "title": "“This week’s favourites” color",
    "selector": ".section-head h2",
    "property": "color",
    "wrong": "#D62828",
    "correct": "#4D6A7A"
  },
  {
    "id": "S20",
    "page": "home",
    "area": "favourites",
    "title": "Plant name size",
    "selector": ".page-home .product-card h3",
    "property": "font-size",
    "wrong": "30px",
    "correct": "20px"
  },
  {
    "id": "S21",
    "page": "home",
    "area": "favourites",
    "title": "Price color",
    "selector": ".page-home .price",
    "property": "color",
    "wrong": "#FF3D7F",
    "correct": "#4D6A7A"
  },
  {
    "id": "S22",
    "page": "home",
    "area": "newsletter",
    "title": "Newsletter background",
    "selector": ".newsletter-inner",
    "property": "background-color",
    "wrong": "#FFC300",
    "correct": "#C7D7E5"
  },
  {
    "id": "S23",
    "page": "home",
    "area": "newsletter",
    "title": "Newsletter text color",
    "selector": ".newsletter p",
    "property": "color",
    "wrong": "#D62828",
    "correct": "#4A5A55"
  },
  {
    "id": "S24",
    "page": "home",
    "area": "newsletter",
    "title": "“Subscribe” button color",
    "selector": ".newsletter .btn-primary",
    "property": "background-color",
    "wrong": "#FF3D7F",
    "correct": "#6B7F6B"
  },
  {
    "id": "S25",
    "page": "shop",
    "area": "shop",
    "title": "“All plants” heading color",
    "selector": ".page-shop .page-head h1",
    "property": "color",
    "wrong": "#D98B6A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S26",
    "page": "shop",
    "area": "shop",
    "title": "Price color",
    "selector": ".shop-grid .price",
    "property": "color",
    "wrong": "#D98B6A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S27",
    "page": "shop",
    "area": "shop",
    "title": "Active filter chip",
    "selector": ".chip.is-active",
    "property": "background-color",
    "wrong": "#E9BFA0",
    "correct": "#A7B69A"
  },
  {
    "id": "S28",
    "page": "shop",
    "area": "shop",
    "title": "Active filter chip border",
    "selector": ".chip.is-active",
    "property": "border-color",
    "wrong": "#E9BFA0",
    "correct": "#A7B69A"
  },
  {
    "id": "S29",
    "page": "shop",
    "area": "shop",
    "title": "Plant name size",
    "selector": ".shop-grid .product-card h3",
    "property": "font-size",
    "wrong": "28px",
    "correct": "20px"
  },
  {
    "id": "S30",
    "page": "product",
    "area": "product",
    "title": "“Add to cart” corners",
    "selector": ".add-to-cart",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "999px"
  },
  {
    "id": "S31",
    "page": "product",
    "area": "product",
    "title": "Description color",
    "selector": ".product-desc",
    "property": "color",
    "wrong": "#A7B69A",
    "correct": "#4A5A55"
  },
  {
    "id": "S32",
    "page": "product",
    "area": "product",
    "title": "Price size",
    "selector": ".product-price",
    "property": "font-size",
    "wrong": "18px",
    "correct": "28px"
  },
  {
    "id": "S33",
    "page": "product",
    "area": "product",
    "title": "Art panel corners",
    "selector": ".product-hero-art",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "32px"
  },
  {
    "id": "S34",
    "page": "cart",
    "area": "cart",
    "title": "Total weight",
    "selector": ".summary-total",
    "property": "font-weight",
    "wrong": "400",
    "correct": "700"
  },
  {
    "id": "S35",
    "page": "cart",
    "area": "cart",
    "title": "Total size",
    "selector": ".summary-total",
    "property": "font-size",
    "wrong": "16px",
    "correct": "22px"
  },
  {
    "id": "S36",
    "page": "cart",
    "area": "cart",
    "title": "Checkout button color",
    "selector": ".checkout-btn",
    "property": "background-color",
    "wrong": "#D98B6A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S37",
    "page": "cart",
    "area": "cart",
    "title": "Thumbnail corners",
    "selector": ".cart-thumb",
    "property": "border-radius",
    "wrong": "50%",
    "correct": "14px"
  },
  {
    "id": "S38",
    "page": "cart",
    "area": "cart",
    "title": "“Remove” link color",
    "selector": ".remove",
    "property": "color",
    "wrong": "#D98B6A",
    "correct": "#6B7F6B"
  },
  {
    "id": "S39",
    "page": "about",
    "area": "about",
    "title": "“What we care about” size",
    "selector": ".values h2",
    "property": "font-size",
    "wrong": "28px",
    "correct": "40px"
  },
  {
    "id": "S40",
    "page": "about",
    "area": "about",
    "title": "Quote color",
    "selector": ".about-quote blockquote",
    "property": "color",
    "wrong": "#D98B6A",
    "correct": "#6B7F6B"
  },
  {
    "id": "S41",
    "page": "about",
    "area": "about",
    "title": "Sun circle color",
    "selector": ".aa-sun",
    "property": "color",
    "wrong": "#8FA7B3",
    "correct": "#E9BFA0"
  },
  {
    "id": "S42",
    "page": "about",
    "area": "about",
    "title": "Value card background",
    "selector": ".value-card",
    "property": "background-color",
    "wrong": "#F6E3D6",
    "correct": "#E5EBDF"
  },
  {
    "id": "S43",
    "page": "journal",
    "area": "journal",
    "title": "2nd post title font",
    "selector": ".post-grid .post-card:nth-child(2) h3",
    "property": "font-family",
    "wrong": "'DM Sans', system-ui, sans-serif",
    "correct": "'Fraunces', Georgia, serif"
  },
  {
    "id": "S44",
    "page": "journal",
    "area": "journal",
    "title": "3rd post tag color",
    "selector": ".post-grid .post-card:nth-child(3) .tag",
    "property": "background-color",
    "wrong": "#E9BFA0",
    "correct": "#C7D7E5"
  },
  {
    "id": "S45",
    "page": "journal",
    "area": "journal",
    "title": "Post art height",
    "selector": ".post-art",
    "property": "height",
    "wrong": "110px",
    "correct": "200px"
  },
  {
    "id": "S46",
    "page": "article",
    "area": "article",
    "title": "Body text size",
    "selector": ".article-body",
    "property": "font-size",
    "wrong": "15px",
    "correct": "18px"
  },
  {
    "id": "S47",
    "page": "article",
    "area": "article",
    "title": "Body line height",
    "selector": ".article-body",
    "property": "line-height",
    "wrong": "1.4",
    "correct": "1.7"
  },
  {
    "id": "S48",
    "page": "article",
    "area": "article",
    "title": "Pull-quote border color",
    "selector": ".pull-quote",
    "property": "border-left-color",
    "wrong": "#D98B6A",
    "correct": "#A7B69A"
  },
  {
    "id": "S49",
    "page": "article",
    "area": "article",
    "title": "Pull-quote border width",
    "selector": ".pull-quote",
    "property": "border-left-width",
    "wrong": "10px",
    "correct": "4px"
  },
  {
    "id": "S50",
    "page": "article",
    "area": "article",
    "title": "Title color",
    "selector": ".article-head h1",
    "property": "color",
    "wrong": "#A7B69A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S51",
    "page": "article",
    "area": "article",
    "title": "Banner corners",
    "selector": ".article-banner",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "32px"
  },
  {
    "id": "S52",
    "page": "faq",
    "area": "faq",
    "title": "Question background",
    "selector": ".faq-item summary",
    "property": "background-color",
    "wrong": "#A7B69A",
    "correct": "#C7D7E5"
  },
  {
    "id": "S53",
    "page": "faq",
    "area": "faq",
    "title": "+/× icon shape",
    "selector": ".faq-icon",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "50%"
  },
  {
    "id": "S54",
    "page": "faq",
    "area": "faq",
    "title": "Heading size",
    "selector": ".page-faq .page-head h1",
    "property": "font-size",
    "wrong": "36px",
    "correct": "52px"
  },
  {
    "id": "S55",
    "page": "faq",
    "area": "faq",
    "title": "“Still stuck?” card background",
    "selector": ".faq-aside",
    "property": "background-color",
    "wrong": "#F6E3D6",
    "correct": "#E5EBDF"
  },
  {
    "id": "S56",
    "page": "contact",
    "area": "contact",
    "title": "Field corners",
    "selector": ".contact-form .field input, .contact-form .field select, .contact-form .field textarea",
    "property": "border-radius",
    "wrong": "0px",
    "correct": "12px"
  },
  {
    "id": "S57",
    "page": "contact",
    "area": "contact",
    "title": "Label size",
    "selector": ".contact-form label",
    "property": "font-size",
    "wrong": "11px",
    "correct": "14px"
  },
  {
    "id": "S58",
    "page": "contact",
    "area": "contact",
    "title": "“Send message” text color",
    "selector": ".contact-form .btn-primary",
    "property": "color",
    "wrong": "#2F3D3A",
    "correct": "#FFFFFF"
  },
  {
    "id": "S59",
    "page": "contact",
    "area": "contact",
    "title": "Address card background",
    "selector": ".contact-card",
    "property": "background-color",
    "wrong": "#6B7F6B",
    "correct": "#4D6A7A"
  },
  {
    "id": "S60",
    "page": "signin",
    "area": "signin",
    "title": "Card width",
    "selector": ".signin-card",
    "property": "width",
    "wrong": "520px",
    "correct": "420px"
  },
  {
    "id": "S61",
    "page": "signin",
    "area": "signin",
    "title": "“Create an account” color",
    "selector": ".signin-card .text-link",
    "property": "color",
    "wrong": "#D98B6A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S62",
    "page": "signin",
    "area": "signin",
    "title": "“Sign in” button color",
    "selector": ".signin-btn",
    "property": "background-color",
    "wrong": "#D98B6A",
    "correct": "#4D6A7A"
  },
  {
    "id": "S63",
    "page": "signin",
    "area": "signin",
    "title": "“Welcome back” size",
    "selector": ".signin-card h1",
    "property": "font-size",
    "wrong": "24px",
    "correct": "34px"
  }
];
