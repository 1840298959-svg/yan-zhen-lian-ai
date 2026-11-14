declare module "pdf-parse/lib/pdf-parse.js" {
  type PageData = {
    getTextContent(options: {
      normalizeWhitespace: boolean;
      disableCombineTextItems: boolean;
    }): Promise<{ items: Array<{ str?: string }> }>;
  };
  type Options = { pagerender?: (page: PageData) => Promise<string> };
  type Result = { numpages: number; text: string };
  export default function pdf(data: Buffer, options?: Options): Promise<Result>;
}
