# areedHatke

areedHatke is a smartphone price comparison and tracking platform that helps users find the best deals across multiple e-commerce marketplaces.

In today's digital world, the same product can be listed at different prices across different e-commerce platforms. Users often have to visit multiple websites, compare prices manually, and figure out whether a price drop is genuine.

areedHatke aims to solve this problem by providing a centralized platform where users can compare prices, view marketplace-specific ratings, and check historical price trends before making a purchase.

## Features

- **Price comparison:** Compare smartphone prices across supported marketplaces.
- **Price history:** View historical price trends and understand how a product's price changes over time.
- **Marketplace-specific ratings:** View product ratings separately for each marketplace.
- **Best deal identification:** Find the marketplace offering the lowest available price.
- **Product registration by URL:** Paste a product link from a supported marketplace to register and view the product.

### Supported marketplaces

- Amazon
- Flipkart
- Reliance Digital
- Croma

## How it works

1. Copy a smartphone product URL from one of the supported marketplaces.
2. Paste the URL into areedHatke.
3. The backend processes the product information and associates it with the relevant product catalogue entry.
4. View the available marketplace listings, prices, ratings, and price history.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Browser automation / scraping | Playwright |
| Background job processing | BullMQ |
| Queue infrastructure | Redis |

## Engineering challenges and solutions

### 1. Building an independent product catalogue

**Challenge:** Build and maintain an independent product catalogue instead of relying entirely on individual marketplace pages.

**Solution:** Use one marketplace as the initial source for creating canonical product records. Store each distinct product variant independently so that listings can be associated with the correct product configuration.

### 2. Fetching current prices from multiple marketplaces

**Challenge:** Each marketplace has a different product page structure and displays product information differently.

**Solution:** Use marketplace-specific scrapers to extract the current price from each supported marketplace.

### 3. Managing product variants

**Challenge:** The same smartphone can have different RAM, storage, or colour configurations.

**Solution:** Maintain separate product records for distinct variants to support accurate product matching and price comparison.

### 4. Maintaining price history

**Challenge:** Keep current marketplace prices up to date while preserving historical price records.

**Solution:** Use BullMQ and Redis to manage scheduled background price-checking jobs. The jobs run once a day, fetch the latest prices, and save price-history records.

## Price-tracking workflow

The price-tracking process runs automatically once a day:

1. Fetch the registered product listings from the database.
2. Read each listing's product URL and marketplace.
3. Select the appropriate marketplace-specific scraper.
4. Scrape the latest product price.
5. Save the previous price as a historical record.
6. Update the current price in the corresponding product listing.

This process keeps marketplace listing prices updated and builds a historical record over time.

## Database design

The database contains four main entities:

- **Product:** Stores common smartphone information and product variant details.
- **ProductListing:** Connects a product to a marketplace and stores the marketplace-specific URL and current price.
- **Marketplace:** Stores information about the supported e-commerce platforms.
- **History:** Stores historical price records created during scheduled price checks.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Register a product using its marketplace URL. |
| `GET` | `/product` | Retrieve all products. |
| `GET` | `/product/:id` | Retrieve details of a specific product. |
| `GET` | `/product/:id/history` | Retrieve historical price records for a product. |
| `GET` | `/productlisting` | Retrieve marketplace-specific product listings and prices. |

## Getting started

### Prerequisites

Make sure you have the following installed and available:

- [Node.js](https://nodejs.org/)
- npm
- PostgreSQL
- Redis

### 1. Clone the repository

```bash
git clone https://github.com/shivp0404/PriceTracker.git
cd PriceTracker
```

The repository contains two applications:

```text
PriceTracker/
├── Backend/
└── Frontend/
```

### 2. Set up the backend

Open a terminal in the `Backend` directory:

```bash
cd Backend
npm install
```

#### Install backend dependencies

Install the runtime dependencies:

```bash
npm install @prisma/adapter-pg@^7.10.1 @prisma/client@^7.10.1 bullmq@^6.7.8 cors@^2.8.6 dotenv@^18.0.10 express@^5.3.0 ioredis@^6.0.0 pg@^8.23.1 playwright@^1.65.1
```

Install the development dependencies and TypeScript types:

```bash
npm install -D @types/node@^26.6.6 @types/pg@^8.23.1 @types/cors@^2.8.19 @types/express@^5.0.6 prisma@^7.10.1 tsx@^4.23.15 typescript@^7.0.2
```

> `cheerio`, `node-cron`, and `@types/node-cron` are not included because this setup uses Playwright and BullMQ instead.

#### Configure environment variables

Create a `.env` file in the `Backend` directory and add your PostgreSQL connection string:

```env
DATABASE_URL="Enter your database connection string"
```

Replace the placeholder with your actual PostgreSQL connection string.

Make sure your PostgreSQL database and Redis server are running.

#### Install Playwright browsers

```bash
npx playwright install
```

#### Run Prisma migrations and generate the client

```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Set up the frontend

Open a **separate terminal** and navigate to the `Frontend` directory:

```bash
cd PriceTracker/Frontend
npm install
```

### 4. Run the applications

Start the backend from the `Backend` directory:

```bash
npm run dev
```

Start the frontend from the `Frontend` directory in the separate terminal:

```bash
npm run dev
```

### 5. Open the application

Once both applications are running, open:

[http://localhost:5173](http://localhost:5173)

You are good to go!

## Future improvements

- **Price drop alerts:** Notify users when a product reaches their target price.
- **AI-based price prediction:** Analyze historical price trends to estimate potential future price movements.
- **Purchase insights:** Help users decide whether to buy now or wait for a possible price drop.
- **Product discovery:** Show smartphone cards with detailed specifications, marketplace comparisons, and the best available offers.

---

**Note:** Price availability and scraping results may vary depending on marketplace website changes and accessibility.
