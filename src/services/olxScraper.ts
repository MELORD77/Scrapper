import puppeteer from 'puppeteer-extra';
import { Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { AdItem } from '../types/types';

puppeteer.use(StealthPlugin());

class OLXScraper {
  async scrapeOLX(searchQuery: string, maxPrice: number | null = null, ): Promise<AdItem[]> {
    console.log(`Opening browser for "${searchQuery}"...`);
    const browser = await puppeteer.launch({ 
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
    const allItems: AdItem[] = [];
    let totalPages =  1; // fallback agar pagination topilmasa


  
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      let url = `https://www.olx.uz/list/q-${encodeURIComponent(searchQuery)}/?page=${pageNumber}`;
      if (maxPrice) {
        url += `&search[filter_float_price:to]=${maxPrice}`;
      }
  
      console.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  
      if (pageNumber === 1) {
        try {
          await page.waitForSelector('button[data-testid="accept-cookies-button"]', { timeout: 3000 });
          await page.click('button[data-testid="accept-cookies-button"]');
          await page.waitForTimeout(2000);
        } catch (e) {
          console.log('Cookie button not found');
        }
      }
  
      await this.autoScroll(page);
  
      console.log(`Collecting data from page ${pageNumber}...`);
      const items = await page.evaluate(() => {
        const results: AdItem[] = [];
        const ads = document.querySelectorAll('[data-cy="l-card"]');
    
        ads.forEach(item => {
          const price = item.querySelector('[data-testid="ad-price"]')?.textContent?.trim() || 'Narx ko\'rsatilmagan';
          const location = item.querySelector('[data-testid="location-date"]')?.textContent?.trim() || 'Manzil ko\'rsatilmagan';
          const link = item.querySelector('a')?.href || '#';
          const title = link.split('/').pop()?.split('.')[0] || 'Noma\'lum';
          const image = item.querySelector('img')?.src || 'https://via.placeholder.com/150';
          const id = link.split('/').pop()?.split('.')[0] || Math.random().toString(36).substring(7);
  
          results.push({ id, title, price, location, link, image });
        });
  
        return results;
      });
  
      if (items.length === 0) {
        console.log(`No more items found on page ${pageNumber}. Stopping.`);
        break;
      }
  
      allItems.push(...items);
    }
  
    await browser.close();
    console.log(`Scraping completed. Found ${allItems.length} items.`);
    
    return allItems;
  }
  

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }
}

export const olxScraper = new OLXScraper();