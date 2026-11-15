'use strict';
/**
 * INC-PHAT-01 CLI - loads a catalogue / per-period input file of PMTL into the inc_ tables of a COPY of the database.
 *   node scripts/income/inc-catalog-import.js <kind> --db <copy> --file <xlsx|csv|json> [--hieu-luc YYYY-MM] [--actor name] [--apply]
 * kind: routes | price-by-code | price-tables | params | postman-hrm | employees | hscl-exempt | penalty | ctv | postman-unit | dhl-route
 * Dry run by default (everything is rolled back); --apply writes. The schema must already be applied (migrate_inc_phat_01_schema.js).
 */
const path = require('path');
const importers = require('../../src/services/income/incCatalogImporters');
const { parseArgs, requireCopyDb } = require('./_cli');

const KINDS = {
    routes: importers.importRouteGroups, 'price-by-code': importers.importPriceByCode, 'price-tables': importers.importPriceTables,
    params: importers.importParams, 'postman-hrm': importers.importPostmanHrm, employees: importers.importEmployees,
    'hscl-exempt': importers.importHsclExempt, penalty: importers.importPenalty, ctv: importers.importCtv,
    'postman-unit': importers.importPostmanUnit, 'dhl-route': importers.importDhlRoute,
};

(async () => {
    const args = parseArgs(process.argv.slice(2));
    const kind = args._[0];
    if (!KINDS[kind] || !args.file) { console.error(`Usage: <kind: ${Object.keys(KINDS).join(' | ')}> --db <copy> --file <path> [--hieu-luc YYYY-MM] [--actor name] [--apply]`); process.exit(2); }
    const db = requireCopyDb(args);
    const result = await KINDS[kind]({ db, file: path.resolve(args.file), hieuLucTu: args['hieu-luc'], actor: args.actor || 'cli', dryRun: !args.apply });
    console.log(JSON.stringify({ kind, dryRun: !args.apply, ...result }, null, 2));
})().catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
