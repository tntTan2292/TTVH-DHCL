'use strict';

const { attachSourceEvidence, F13_REPORT, sourceIdentity } = require('./dkclImportOperationsContract');

class BaseF13Adapter {
    constructor({ source, acquisition }) {
        this.source = source;
        this.report = F13_REPORT;
        this.acquisition = acquisition;
    }

    identity() {
        return sourceIdentity(this.source, this.report);
    }

    async runOneDate(measurementDate, context = {}) {
        const result = await this.acquisition(measurementDate, context);
        return this.withEvidenceIdentity(result);
    }

    withEvidenceIdentity(evidence = {}) {
        return attachSourceEvidence(evidence, {
            source: this.source,
            report: this.report,
            originalFilename: evidence?.generatedPortalFilename || evidence?.downloaded_filename || evidence?.exported_filename || null,
            standardizedFilename: evidence?.standardizedFilename || evidence?.processed_filename || null,
            processedPath: evidence?.finalFileLocation || evidence?.processed_file_path || null
        });
    }
}

class HueF13Adapter extends BaseF13Adapter {
    constructor({ syncService, sessionPreflightService }) {
        super({
            source: 'HUE',
            acquisition: async (measurementDate, { refreshRequested = false, portalClient = null } = {}) => {
                const result = await syncService.start(measurementDate, {
                    requireExistingSession: true,
                    forceReimport: refreshRequested,
                    portalClient: portalClient || sessionPreflightService.getInteractiveClient?.('HUE') || null
                });
                return result;
            }
        });
        this.syncService = syncService;
        this.sessionPreflightService = sessionPreflightService;
    }

    getRun(runId) {
        return this.syncService.getRun(runId);
    }
}

class TctF13Adapter extends BaseF13Adapter {
    constructor({ runOneDateImport }) {
        super({
            source: 'TCT',
            acquisition: (measurementDate, context) => runOneDateImport(measurementDate, context.queueId, {
                refreshRequested: context.refreshRequested
            })
        });
    }
}

module.exports = {
    BaseF13Adapter,
    HueF13Adapter,
    TctF13Adapter
};
