import {logger, MCPResource, ResourceContent} from "mcp-framework";
import {google} from "googleapis";
import { SimpleCache } from "../tools/helpers/cache.js";

const sheetCache = new SimpleCache<any[][][]>(2 * 60 * 1000); // 2 min TTL

class PipelineFailureSheetResource extends MCPResource  {
  uri = "resource://google/spreadsheets/pipeline-failure-details";
  name = "Pipeline failure details from spreadsheet";
  description = "Resource for extracting exisiting pipeline failure details from the multiple spreadsheets";
  mimeType = "application/json";

  async read(): Promise<ResourceContent[]> {
    const sheetDetails = await this.fetchExistingPipelineFailureDetails();
    return [
      {
        uri: this.uri,
        mimeType: this.mimeType,
        text: JSON.stringify({message: sheetDetails}),
      },
    ];
  }

  private async fetchExistingPipelineFailureDetails(): Promise<any[][][]> {
    const cacheKey = "pipeline-failure-details";
    if (sheetCache.has(cacheKey)) {
      logger.info("Returning cached Google Sheet data for key: " + cacheKey);
      return sheetCache.get(cacheKey)!;
    }

    // Authenticate using the service account
    const auth = new google.auth.GoogleAuth({
      apiKey: process.env.GOOGLE_API_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // Create a Sheets API client
    const sheets = google.sheets({version: "v4", auth});

    try {
      const sheetIds = process.env.GOOGLE_SHEET_ID?.split(",") || [];
      // Fetch data from the specified range in the Google Sheets
      const sheetPromises = sheetIds.map((spreadsheetId) => sheets.spreadsheets.values.get({ spreadsheetId, range: 'sheet1' }));

      const responses = await Promise.all(sheetPromises);
      const result = responses.map(response => response.data.values || []);
      sheetCache.set(cacheKey, result);
      logger.info("Fetched Google Sheet data successfully: "+ result);
      return result;
    } catch (error) {
      console.error("Error fetching Google Sheet data:", error);
      throw error;
    }
  }
}

export default PipelineFailureSheetResource;
