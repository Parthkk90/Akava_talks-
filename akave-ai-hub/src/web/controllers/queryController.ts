import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { QueryService, QueryRequest } from '../services/queryService';
import { DatabaseService } from '../services/databaseService';

export class QueryController {
  constructor(
    private dbService: DatabaseService,
    private queryService: QueryService
  ) {}

  /**
   * Execute a SQL query on structured datasets
   */
  public executeQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { query, datasetIds, outputFormat, limit } = req.body;

    // Validate required fields
    if (!query || !datasetIds || !Array.isArray(datasetIds) || datasetIds.length === 0) {
      res.status(400).json({ 
        status: 'error', 
        message: 'query and datasetIds are required.' 
      });
      return;
    }

    if (!outputFormat || !['json', 'csv', 'table'].includes(outputFormat)) {
      res.status(400).json({ 
        status: 'error', 
        message: 'outputFormat must be one of: json, csv, table.' 
      });
      return;
    }

    try {
      // Verify that all datasets belong to the user
      for (const datasetId of datasetIds) {
        const manifest = await this.dbService.getManifestById(datasetId);
        if (!manifest || manifest.userId !== req.user.id) {
          res.status(404).json({ 
            status: 'error', 
            message: `Dataset ${datasetId} not found or access denied.` 
          });
          return;
        }
      }

      const request: QueryRequest = {
        query,
        datasetIds,
        outputFormat,
        limit
      };

      const result = await this.queryService.executeQuery(req.user.id, request);

      res.status(201).json({
        status: 'success',
        message: 'Query execution started.',
        data: result
      });

    } catch (error: any) {
      console.error('Failed to execute query:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Failed to execute query.' 
      });
    }
  };

  /**
   * Get query result by ID
   */
  public getQueryResult = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    try {
      const result = await this.queryService.getQueryResult(req.user.id, id);
      
      if (!result) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Query result not found or access denied.' 
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: result
      });

    } catch (error: any) {
      console.error('Failed to get query result:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve query result.' 
      });
    }
  };

  /**
   * List query results for the authenticated user
   */
  public listQueryResults = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    try {
      const results = await this.queryService.listQueryResults(req.user.id, limit, offset);
      
      res.status(200).json({
        status: 'success',
        data: results
      });

    } catch (error: any) {
      console.error('Failed to list query results:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve query results.' 
      });
    }
  };

  /**
   * Cancel a running query - not implemented in current service
   */
  public cancelQuery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    res.status(400).json({ 
      status: 'error', 
      message: 'Query cancellation not implemented.' 
    });
  };

  /**
   * Get available structured datasets for the user
   */
  public getStructuredDatasets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    try {
      const datasets = await this.queryService.getStructuredDatasets(req.user.id);

      res.status(200).json({
        status: 'success',
        data: datasets
      });

    } catch (error: any) {
      console.error('Failed to get structured datasets:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve structured datasets.' 
      });
    }
  };

  /**
   * Get dataset schema/preview
   */
  public getDatasetSchema = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    try {
      // Verify dataset belongs to user
      const manifest = await this.dbService.getManifestById(id);
      if (!manifest || manifest.userId !== req.user.id) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Dataset not found or access denied.' 
        });
        return;
      }

      const schema = await this.queryService.getDatasetSchema(req.user.id, id);

      res.status(200).json({
        status: 'success',
        data: schema
      });

    } catch (error: any) {
      console.error('Failed to get dataset schema:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Failed to retrieve dataset schema.' 
      });
    }
  };

  /**
   * Get query examples and templates
   */
  public getQueryExamples = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const examples = await this.queryService.getQueryExamples();

      res.status(200).json({
        status: 'success',
        data: examples
      });
    } catch (error: any) {
      console.error('Failed to get query examples:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve query examples.' 
      });
    }
  };
}