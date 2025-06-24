import {logger, MCPResource, ResourceContent} from "mcp-framework";
import {google} from "googleapis";

class PipelineFailureSheetResource extends MCPResource  {
  uri = "resource://google/spreadsheets/pipeline-failure-details";
  name = "Pipeline failure details from spreadsheet";
  description = "Resource for extracting exisiting pipeline failure details from the multiple spreadsheets";
  mimeType = "application/json";

  private cache: any = null;
  private lastFetch: number = 0;
  private TTL = 120000; // 2 minutes in milliseconds

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
    if (this.cache && Date.now() - this.lastFetch < this.TTL) {
      return this.cache;
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
      this.cache = responses.map(response => response.data.values || []);
      this.lastFetch = Date.now();
      // Return the fetched data
      logger.info("Fetched Google Sheet data successfully: "+ this.cache);
      return this.cache;
    } catch (error) {
      console.error("Error fetching Google Sheet data:", error);
      throw error;
    }
  }
}

export default PipelineFailureSheetResource;
