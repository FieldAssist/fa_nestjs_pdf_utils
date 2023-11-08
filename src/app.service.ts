import { Injectable } from '@nestjs/common';
import fs from 'fs';
import pdf from 'pdf-parse';

export type Page = { index: number; lines: string[] };

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async parseInvoicePdf(file: Express.Multer.File) {
    // const filepath = path.join(
    //   __dirname,
    //   './../../../templates/pdfs/zepto.pdf',
    // );
    // const pdfParser = new PDFParser(this, 1);
    //
    // pdfParser.on("pdfParser_dataError", (errData) => console.error(errData));
    // pdfParser.on("pdfParser_dataReady", (pdfData) => {
    //   fs.writeFile("./F1040EZ.json", JSON.stringify(pdfData), (err) => {
    //     console.error(err);
    //   });
    // });
    //
    // await pdfParser.loadPDF(filepath);

    // const dataBuffer = fs.readFileSync(filepath);
    const dataBuffer = file.buffer;
    const data = await pdf(dataBuffer);
    // number of pages
    // console.log(data.numpages);
    // // number of rendered pages
    // console.log(data.numrender);
    // // PDF info
    // console.log(data.info);
    // // PDF metadata
    // console.log(data.metadata);
    // // PDF.js version
    // // check https://mozilla.github.io/pdf.js/getting_started/
    // console.log(data.version);
    // // PDF text
    // console.log(data.text);

    fs.writeFileSync('./text.txt', data.text);

    let pages: Page[] = [];
    const rawPages = data.text.split('Page ');
    for (const rawPage of rawPages) {
      const pageLines = rawPage.split('\n');
      pages.push({ index: rawPages.indexOf(rawPage), lines: pageLines });
    }

    pages = this.sanitizePages(pages);
    console.log(pages);

    const firstPage = pages[0];

    // Vendor Details
    const vendorDetails = this.extractSellerDetails(firstPage);

    return { success: true };
  }

  private sanitizePages(pages: Page[]) {
    const newPages = [];
    for (const page of pages) {
      if (
        page.lines.length > 2 &&
        page.lines[1].toString().toLowerCase().includes('purchase order')
      ) {
        newPages.push({
          index: page.index,
          lines: page.lines.slice(2, page.lines.length),
        });
      }
    }
    return newPages;
  }

  private extractSellerDetails(firstPage: Page) {
    const sellerDetails = {
      name: '',
      address: '',
      postalCode: '',
      gstin: '',
      pan: '',
      mobile: '',
    };
    const lines: string[] = [];

    for (const line of firstPage.lines) {
      if (line.includes('PO No:')) {
        break;
      } else {
        lines.push(line);
      }
    }

    sellerDetails.name = lines[1].trim();

    for (const line of lines) {
      if (line.includes('Postal Code:')) {
        sellerDetails.postalCode = line.split('Postal Code:')[1].trim();
      }
      if (line.includes('GSTIN:')) {
        sellerDetails.gstin = line.split('GSTIN:')[1].trim();
      }
      if (line.includes('PAN:')) {
        sellerDetails.pan = line.split('PAN:')[1].trim();
      }
      if (line.includes('Contact:')) {
        sellerDetails.mobile = line.split('Contact:')[1].trim();
      }
    }

    // fetch address
    let addressLines = [];
    for (const line of lines) {
      if (!line.includes(':')) {
        addressLines.push(line);
      }
    }
    addressLines.shift();
    sellerDetails.address = addressLines.join(' ').trim();

    return sellerDetails;
  }
}
