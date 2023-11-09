import { Injectable } from '@nestjs/common';
import fs from 'fs';
import pdf from 'pdf-parse';
import { renderPage } from './utils/pdf';

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

    let options = {
      pagerender: renderPage,
    };

    const data = await pdf(dataBuffer, options);
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
    const buyerDetails = this.extractBuyerDetails(firstPage);
    const poDetails = this.extractPoDetails(firstPage);
    const buyerBillingAddress = this.extractBuyerBillingAddress(firstPage);
    const orderItems = this.extractLineItem(firstPage);

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

  private extractBuyerDetails(firstPage: Page) {
    const details = {
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

    details.name = lines[1].trim();

    for (const line of lines) {
      if (line.includes('Postal Code:')) {
        details.postalCode = line.split('Postal Code:')[1].trim();
      }
      if (line.includes('GSTIN:')) {
        details.gstin = line.split('GSTIN:')[1].trim();
      }
      if (line.includes('PAN:')) {
        details.pan = line.split('PAN:')[1].trim();
      }
      if (line.includes('Contact:')) {
        details.mobile = line.split('Contact:')[1].trim();
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
    details.address = addressLines.join(' ').trim();

    return details;
  }

  private extractPoDetails(firstPage: Page) {
    const details = {
      poNo: '',
      poCreationDate: '',
    };

    const startIndex = firstPage.lines.findIndex((value) =>
      value.includes('PO No'),
    );
    details.poNo = firstPage.lines[startIndex + 1].trim();
    details.poCreationDate = firstPage.lines[startIndex + 3].trim();

    return details;
  }

  private extractBuyerBillingAddress(firstPage: Page) {
    const details = {
      firmName: '',
      address: '',
      gstin: '',
      pan: '',
      mobile: '',
    };

    // extract relevant lines
    const startIndex = firstPage.lines.findIndex((value) =>
      value.includes('Billing AddressShipping Address'),
    );
    let lines = firstPage.lines.slice(startIndex + 1);
    const endLineIndex = lines.findIndex((value) => value.includes('Contact'));
    lines = lines.slice(0, endLineIndex + 1);

    details.firmName = lines[0].trim();

    for (const line of lines) {
      if (line.includes('GSTIN:')) {
        details.gstin = line.split('GSTIN:')[1].trim();
      }
      if (line.includes('PAN:')) {
        details.pan = line.split('PAN:')[1].trim();
      }
      if (line.includes('Contact:')) {
        details.mobile = line.split('Contact:')[1].trim();
      }
    }

    // address
    const endAddressLineIndex = lines.findIndex((value) =>
      value.includes('GSTIN:'),
    );
    const addressLines = lines.slice(1, endAddressLineIndex);
    details.address = addressLines.join(' ').trim();

    return details;
  }

  private extractBuyerShippingAddress(firstPage: Page) {
    const details = {
      firmName: '',
      address: '',
      gstin: '',
      pan: '',
      mobile: '',
    };

    // extract relevant lines
    let startIndex = firstPage.lines.findIndex((value) =>
      value.includes('Billing AddressShipping Address'),
    );
    let lines = firstPage.lines.slice(startIndex + 1);
    startIndex = lines.findIndex((value) => value.includes('Contact'));
    const endLineIndex = lines.findIndex((value) => value.includes('Contact'));
    lines = lines.slice(startIndex + 1, endLineIndex + 1);

    details.firmName = lines[0].trim();

    for (const line of lines) {
      if (line.includes('GSTIN:')) {
        details.gstin = line.split('GSTIN:')[1].trim();
      }
      if (line.includes('PAN:')) {
        details.pan = line.split('PAN:')[1].trim();
      }
      if (line.includes('Contact:')) {
        details.mobile = line.split('Contact:')[1].trim();
      }
    }

    // address
    const endAddressLineIndex = lines.findIndex((value) =>
      value.includes('GSTIN:'),
    );
    const addressLines = lines.slice(1, endAddressLineIndex);
    details.address = addressLines.join(' ').trim();

    return details;
  }

  private extractLineItem(firstPage: Page) {
    const startIndex = firstPage.lines.findIndex((value) =>
      value.includes('Total(INR)'),
    );
    const endIndex = firstPage.lines.findIndex((value) =>
      value.includes('Total Amount (INR)'),
    );
    const lines = firstPage.lines.slice(startIndex + 1, endIndex + 1);

    const rawItems: { serialNo: number; data: any }[] = [];
    for (let i = 0; i < 30; i++) {
      const line = lines[i];
      if (line.trim().includes(`${i + 1}`)) {
      }
    }
  }
}
