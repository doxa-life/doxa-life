/**
 * DataSourceManager.js
 *
 * Manages loading data from multiple sources (CSV or API) and normalizes
 * the data to use consistent system field names for the map components.
 *
 * Key concepts:
 * - ROP3: Registry of Peoples - identifies a people group (can exist in multiple countries)
 * - ROG: Registry of Geography - country code
 * - ROP3 + ROG: Unique identifier for a people group in a specific country
 * - PeopleID3: Joshua Project ID - used for fetching images (not all rows have this)
 *
 * doxa-map-mfe modification: sources.json is inlined via static import at build time
 * so no fetch is needed in the IIFE built context (where there is no src/ directory).
 */

import sourcesConfig from '../config/sources.json'
import { getApiBaseUrl } from './apiBaseUrl.js'
import { detectLocale } from '../i18n/index.js'
import COUNTRY_ISO3 from '../config/lookups/country-iso3.json'
import RELIGION_ROR from '../config/lookups/religion-ror.json'
import RELIGION_ROR3 from '../config/lookups/religion-ror3.json'

// Flat decode maps — built once, ~250 + 40 + 10 entries.
// Used as a FALLBACK for sources that return raw codes (UUPG) instead of
// the locale-aware {value, label} pairs that pray-tools sends.
const COUNTRY_BY_ISO3   = Object.fromEntries(COUNTRY_ISO3.map(e => [e.value, e.label]))
const RELIGION_BY_CODE  = Object.fromEntries(RELIGION_ROR.map(e => [e.value, e.label]))
const RELIGION_BY_FAMILY = Object.fromEntries(RELIGION_ROR3.map(e => [e.value, e.label]))

// ISO3 country code shape: exactly 3 uppercase letters.
const isIso3Code     = (s) => typeof s === 'string' && /^[A-Z]{3}$/.test(s)
// ROR religion codes are 1–4 uppercase letters (H, MSN, MOF, NAT…).
const isReligionCode = (s) => typeof s === 'string' && /^[A-Z]{1,4}$/.test(s)

export class DataSourceManager {
    constructor() {
        this.sourcesConfig = null;
        this.activeSource = null;
        this.rawData = [];
        this.normalizedData = [];
        this.dataByUniqueId = new Map();
        this.baseUrl = window.MAP_APP_BASE_URL || './';
        
        // CACHE: Store normalized data per source to avoid re-parsing on tab switch
        // Key: sourceId, Value: { normalizedData: [], dataByUniqueId: Map, timestamp: Date }
        this.cache = new Map();
        this.cacheEnabled = true;  // Can be disabled for debugging
        this.cacheTTL = 5 * 60 * 1000;  // 5 minutes cache TTL (optional, currently not used)
    }

    /**
     * Initialize the data source manager.
     * Config is inlined at build time via static import — no fetch needed.
     */
    async init() {
        this.sourcesConfig = sourcesConfig
        return this.sourcesConfig
    }

    /**
     * Get the currently active source ID
     */
    getActiveSourceId() {
        return this.sourcesConfig?.activeSource || 'doxa-api';
    }

    /**
     * Get source configuration by ID
     */
    getSourceConfig(sourceId) {
        return this.sourcesConfig?.sources?.[sourceId];
    }

    /**
     * Set the active data source and load its data
     * @param {string} sourceId - The source ID from sources.json
     */
    async setActiveSource(sourceId) {
        const sourceConfig = this.getSourceConfig(sourceId);
        if (!sourceConfig) {
            throw new Error(`Source not found: ${sourceId}`);
        }

        this.activeSource = sourceConfig;
        
        // CHECK CACHE FIRST - avoid re-parsing CSV on tab switch
        if (this.cacheEnabled && this.cache.has(sourceId)) {
            const cached = this.cache.get(sourceId);
            this.normalizedData = cached.normalizedData;
            this.dataByUniqueId = cached.dataByUniqueId;
            return this.normalizedData;
        }
        

        if (sourceConfig.type === 'csv') {
            await this.loadCSVData(sourceConfig);
        } else if (sourceConfig.type === 'api') {
            await this.loadAPIData(sourceConfig);
        } else if (sourceConfig.type === 'rest-api') {
            await this.loadRestApiData(sourceConfig);
        }
        
        // STORE IN CACHE after loading
        if (this.cacheEnabled) {
            this.cache.set(sourceId, {
                normalizedData: this.normalizedData,
                dataByUniqueId: this.dataByUniqueId,
                timestamp: Date.now()
            });
        }

        return this.normalizedData;
    }
    
    /**
     * Clear the data cache (useful for forcing fresh data load)
     * @param {string} sourceId - Optional: clear specific source, or all if not provided
     */
    clearCache(sourceId = null) {
        if (sourceId) {
            this.cache.delete(sourceId);
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Check if a source is cached
     * @param {string} sourceId - The source ID to check
     * @returns {boolean} True if cached
     */
    isCached(sourceId) {
        return this.cache.has(sourceId);
    }

    /**
     * Load data from the active source (uses config's activeSource)
     */
    async loadActiveSource() {
        if (!this.sourcesConfig) {
            await this.init();
        }
        return this.setActiveSource(this.getActiveSourceId());
    }

    /**
     * Parse CSV text handling quoted fields properly (including multi-line quoted fields)
     */
    parseCSV(csvText) {
        const results = [];
        const headers = [];
        
        // First, we need to handle the fact that quoted fields can span multiple lines
        // We'll parse character by character to handle this properly
        let currentField = '';
        let inQuotes = false;
        let row = [];
        let isHeader = true;
        
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                row.push(currentField.trim());
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                // End of row (skip \r\n as single line break)
                if (char === '\r' && nextChar === '\n') {
                    i++;
                }
                
                // Only process if we have content
                if (currentField || row.length > 0) {
                    row.push(currentField.trim());
                    currentField = '';
                    
                    if (isHeader) {
                        // First complete row is the header
                        headers.push(...row);
                        isHeader = false;
                    } else if (row.length > 1) {
                        // Build object from row
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index] || '';
                        });
                        results.push(obj);
                    }
                    row = [];
                }
            } else {
                currentField += char;
            }
        }
        
        // Handle last row if no trailing newline
        if (currentField || row.length > 0) {
            row.push(currentField.trim());
            if (!isHeader && row.length > 1) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                results.push(obj);
            }
        }
        
        
        return { headers, data: results };
    }

    /**
     * Parse a single CSV line handling quoted fields
     */
    parseCSVLine(line) {
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    currentValue += '"';
                    i++;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());
        
        return values;
    }

    /**
     * Load and parse CSV data
     */
    async loadCSVData(sourceConfig) {
        try {
            const response = await fetch(this.baseUrl + sourceConfig.path);
            const csvText = await response.text();
            
            const { headers, data } = this.parseCSV(csvText);
            this.rawData = data;
            
            
            // VALIDATE FIELD MAPPINGS against CSV headers
            this.validateFieldMappings(sourceConfig.fieldMappings, headers, sourceConfig.name);
            
            // Normalize data to system fields
            this.normalizeData(sourceConfig);
            
            return this.normalizedData;
        } catch (error) {
            console.error('Failed to load CSV data:', error);
            throw error;
        }
    }
    
    /**
     * Validate that all source field mappings exist in the CSV headers
     * Warns about missing fields to help debug data issues
     * @param {object} fieldMappings - The field mappings from sources.json
     * @param {string[]} headers - The CSV headers
     * @param {string} sourceName - Name of the source for logging
     */
    validateFieldMappings(fieldMappings, headers, sourceName) {
        const headerSet = new Set(headers.map(h => h.trim()));
        const missingFields = [];
        const foundFields = [];
        
        for (const [systemField, sourceField] of Object.entries(fieldMappings)) {
            if (Array.isArray(sourceField)) {
                // Composite key - check all parts
                for (const field of sourceField) {
                    if (!headerSet.has(field)) {
                        missingFields.push({ systemField, sourceField: field, isComposite: true });
                    } else {
                        foundFields.push(field);
                    }
                }
            } else {
                if (!headerSet.has(sourceField)) {
                    missingFields.push({ systemField, sourceField, isComposite: false });
                } else {
                    foundFields.push(sourceField);
                }
            }
        }
        
        if (missingFields.length > 0) {
            missingFields.forEach(({ systemField, sourceField, isComposite }) => {
                const composite = isComposite ? ' (part of composite key)' : '';
            });
        } else {
        }
    }

    /**
     * Load data from API
     */
    async loadAPIData(sourceConfig) {
        try {
            const response = await fetch(sourceConfig.url);
            const data = await response.json();
            
            // Handle different API response structures
            this.rawData = Array.isArray(data) ? data : (data.posts || data.data || data.peopleGroups || []);
            
            
            // Normalize data to system fields
            this.normalizeData(sourceConfig);
            
            return this.normalizedData;
        } catch (error) {
            console.error('Failed to load API data:', error);
            throw error;
        }
    }

    /**
     * Load data from a REST API source (type: 'rest-api').
     * Reads VITE_API_BASE_URL at runtime; falls back to empty string (relative).
     * Appends defaultFields as ?fields= query param if the endpoint supports it.
     * On failure, attempts to fall back to fallbackSourceId (if defined).
     *
     * @param {object} sourceConfig - Source config from sources.json
     */
    async loadRestApiData(sourceConfig) {
        const baseUrl = getApiBaseUrl();

        const bulkEndpoint = sourceConfig.endpoints?.bulk || '/api/people-groups/list';
        const fields = sourceConfig.defaultFields?.join(',') || '';

        // Build query string: combine defaultFields param with any static queryParams
        const queryParts = [];
        if (fields) queryParts.push(`fields=${fields}`);
        // Merge static queryParams from sources.json with runtime lang override —
        // the active locale (set by Polylang via document.documentElement.lang)
        // must feed the API so country/language/religion labels come back in the
        // user's language instead of the hardcoded "en" in sources.json.
        const extraParams = { ...(sourceConfig.queryParams || {}), lang: detectLocale() };
        for (const [k, v] of Object.entries(extraParams)) {
            queryParts.push(`${k}=${encodeURIComponent(v)}`);
        }
        // Cache-buster param — guarantees unique URL so ANY intermediate cache
        // (browser HTTP, CDN, service worker) can't serve stale people-group
        // counts. Live adoption / prayer counts must be fresh on every load.
        queryParts.push(`_=${Date.now()}`);
        const url = `${baseUrl}${bulkEndpoint}?${queryParts.join('&')}`;

        try {
            // cache: 'no-store' tells the browser never to read from or write to
            // the HTTP cache for this request. Pairs with the query-buster above
            // to defeat any layered caching between us and the API.
            const response = await fetch(url, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Guard: API may return HTML (Nuxt SPA fallback) instead of JSON
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(
                    `API returned "${contentType}" instead of JSON. ` +
                    `The server at ${baseUrl} may be down or misconfigured. ` +
                    `Prayer data will be unavailable — all pins will show red.`
                );
            }

            const data = await response.json();
            this.rawData = Array.isArray(data) ? data : (data.posts || data.data || data.results || []);


            // Normalize using the fieldMappings from sources.json
            this.normalizeData(sourceConfig);

            return this.normalizedData;
        } catch (error) {
            console.error(`[rest-api] Failed to load from ${sourceConfig.id}:`, error);
            throw error;
        }
    }

    /**
     * Normalize raw data to use system field names
     */
    normalizeData(sourceConfig) {
        const mappings = sourceConfig.fieldMappings;
        this.normalizedData = [];
        this.dataByUniqueId = new Map();
        
        for (const row of this.rawData) {
            const normalized = {};
            
            // Map each system field from source field
            for (const [systemField, sourceField] of Object.entries(mappings)) {
                if (Array.isArray(sourceField)) {
                    // Composite key (e.g., uniqueId from ROP3 + ROG)
                    const values = sourceField.map(f => this.getFieldValue(row, f));
                    normalized[systemField] = values.join('_');
                } else {
                    normalized[systemField] = this.getFieldValue(row, sourceField);
                }
            }
            
            // Parse coordinates as numbers
            normalized.latitude = parseFloat(normalized.latitude) || 0;
            normalized.longitude = parseFloat(normalized.longitude) || 0;
            
            // Skip rows without valid coordinates
            if (normalized.latitude === 0 && normalized.longitude === 0) {
                continue;
            }
            
            // Parse population
            normalized.populationNum = this.parsePopulation(normalized.population);
            
            // Generate image URL
            normalized.imageUrl = this.getImageUrl(normalized, sourceConfig.imageConfig);
            
            // Normalize engagementStatus to a boolean.
            // pray-tools API: engagement_status is a ValueLabel {value, label}
            //   where value is "engaged" or "unengaged" — boolean = (value === 'engaged').
            // Legacy CSV/old-API fallback: numeric/string coercion.
            const es = normalized.engagementStatus;
            if (es != null) {
                if (typeof es === 'object' && 'value' in es) {
                    normalized.engagementStatusLabel = es.label || es.value;
                    normalized.engagementStatus = es.value === 'engaged';
                } else {
                    normalized.engagementStatus = es === true || es === 1 || es === '1' || es === 'true'
                        || (typeof es === 'number' && es > 0)
                        || (typeof es === 'string' && parseInt(es, 10) > 0);
                }
            }

            // Normalize adoptionStatus to a boolean
            // New API: adopted_by_churches is a count (0 or 1+) — adopted if > 0
            const as = normalized.adoptionStatus;
            if (as != null) {
                normalized.adoptionStatus = as === true || as === 1 || as === '1' || as === 'true'
                    || (typeof as === 'object' && !!as?.value)
                    || (typeof as === 'number' && as > 0)
                    || (typeof as === 'string' && parseInt(as, 10) > 0);
            }

            // Normalize { value, label } objects → extract .value for Mapbox string matching
            // New API returns wagf_region, rop1, country_code, religion etc. as objects
            const objectFields = ['doxaRegion', 'wagfRegion', 'wagfBlock', 'wagfMember', 'affinityBlock', 'countryIso', 'religion', 'religionCode'];
            for (const field of objectFields) {
                const val = normalized[field];
                if (val && typeof val === 'object' && 'value' in val) {
                    // Preserve the label as a separate field for display
                    normalized[field + 'Label'] = val.label || val.value;
                    normalized[field] = val.value;
                }
            }

            // ── Human-readable country + religion labels ────────────────────
            // Unified `countryName` / `religionName` fields for display.
            // Priority:
            //   1. pray-tools .label (already decoded + locale-aware via lang=)
            //   2. Our ISO3 / ROR lookup tables (UUPG-style raw codes)
            //   3. Direct string value (CSV already-human-readable names)
            //   4. Raw code as-is (last resort)
            normalized.countryName =
                normalized.countryIsoLabel
                || (isIso3Code(normalized.country)    && COUNTRY_BY_ISO3[normalized.country])
                || (isIso3Code(normalized.countryIso) && COUNTRY_BY_ISO3[normalized.countryIso])
                || (typeof normalized.country === 'string' && !isIso3Code(normalized.country) ? normalized.country : null)
                || normalized.countryIso
                || normalized.country
                || ''

            normalized.religionName =
                normalized.religionLabel
                || (isReligionCode(normalized.religion) && RELIGION_BY_CODE[normalized.religion])
                || (isReligionCode(normalized.religionCode) && RELIGION_BY_FAMILY[normalized.religionCode])
                || (typeof normalized.religion === 'string' && !isReligionCode(normalized.religion) ? normalized.religion : null)
                || normalized.religion
                || ''

            // Store original row data for full access
            normalized._raw = row;
            
            this.normalizedData.push(normalized);
            this.dataByUniqueId.set(normalized.uniqueId, normalized);
        }
        
        // FREE MEMORY: Clear rawData after normalization (saves ~7.5MB RAM)
        const rawDataCount = this.rawData.length;
        this.rawData = null;
    }

    /**
     * Get field value from row, handling different field name formats
     */
    getFieldValue(row, fieldName) {
        // Direct match
        if (row[fieldName] !== undefined) {
            return row[fieldName];
        }
        
        // Try trimmed version
        const trimmed = fieldName.trim();
        if (row[trimmed] !== undefined) {
            return row[trimmed];
        }
        
        // Search for field (handles CSV header variations like " Pop " with spaces)
        for (const key of Object.keys(row)) {
            if (key.trim() === trimmed) {
                return row[key];
            }
            // Also check if the field name is contained in the key (for complex headers)
            if (key.includes(trimmed) || trimmed.includes(key.trim())) {
                return row[key];
            }
        }
        
        return '';
    }

    /**
     * Parse population from various formats
     */
    parsePopulation(popValue) {
        if (!popValue) return 0;
        
        // Remove commas and parse
        const cleaned = String(popValue).replace(/,/g, '').trim();
        const num = parseInt(cleaned, 10);
        
        return isNaN(num) ? 0 : num;
    }

    /**
     * Generate image URL based on config
     * 
     * Two modes:
     * 1. Direct URL mode: Source provides full image URL (like API with imb_picture_url)
     * 2. ID-based mode: Source provides PeopleID3, we generate URL from template
     */
    getImageUrl(normalized, imageConfig) {
        if (!imageConfig) {
            return '';
        }
        
        const placeholderUrl = imageConfig.placeholderUrl || 'https://www.peoplegroups.org/images/pgphotosearch/NoImageAvailable_search.jpg';
        
        // First try the direct photo URL field
        const directUrl = normalized[imageConfig.useField];
        if (directUrl && directUrl.trim() && !directUrl.includes('NoImageAvailable')) {
            return directUrl;
        }
        
        // NOTE: fallbackUrlTemplate (e.g. joshuaproject.net photo URLs) is intentionally
        // NOT used here — those URLs 404 for many groups and pollute the network tab.
        // The placeholderUrl is used directly instead.
        // (fallbackField / fallbackUrlTemplate remain in sources.json for reference.)
        
        // Return placeholder
        return placeholderUrl;
    }

    /**
     * Get all normalized data
     */
    getData() {
        return this.normalizedData;
    }

    /**
     * Get data by unique ID (ROP3_ROG)
     */
    getByUniqueId(uniqueId) {
        return this.dataByUniqueId.get(uniqueId);
    }

    /**
     * Get data by coordinates (for click handling)
     */
    getByCoordinates(lat, lng, tolerance = 0.0001) {
        return this.normalizedData.find(d => 
            Math.abs(d.latitude - lat) < tolerance && 
            Math.abs(d.longitude - lng) < tolerance
        );
    }

    /**
     * Get all data for a people group (same ROP3 across countries)
     */
    getByPeopleGroupId(rop3) {
        return this.normalizedData.filter(d => d.peopleGroupId === rop3);
    }

    /**
     * Get unique language families
     */
    getLanguageFamilies() {
        const families = new Set();
        this.normalizedData.forEach(d => {
            if (d.languageFamily) {
                families.add(d.languageFamily);
            }
        });
        return Array.from(families).sort();
    }

    /**
     * Get data grouped by language family
     */
    getDataByLanguageFamily() {
        const grouped = {};
        this.normalizedData.forEach(d => {
            const family = d.languageFamily || 'Unknown';
            if (!grouped[family]) {
                grouped[family] = [];
            }
            grouped[family].push(d);
        });
        return grouped;
    }

    /**
     * Get data grouped by DOXA region
     */
    getDataByRegion() {
        const grouped = {};
        this.normalizedData.forEach(d => {
            const region = d.doxaRegion || 'Unknown';
            if (!grouped[region]) {
                grouped[region] = [];
            }
            grouped[region].push(d);
        });
        return grouped;
    }

    /**
     * Get summary statistics
     */
    getStats() {
        return {
            totalRecords: this.normalizedData.length,
            withPeopleId3: this.normalizedData.filter(d => d.peopleId3).length,
            withPhotos: this.normalizedData.filter(d => d.imageUrl && !d.imageUrl.includes('NoImageAvailable')).length,
            languageFamilies: this.getLanguageFamilies().length,
            countries: new Set(this.normalizedData.map(d => d.country)).size,
            regions: Object.keys(this.getDataByRegion()).length
        };
    }
}

// Export singleton instance
export const dataSourceManager = new DataSourceManager();

// Export default
export default dataSourceManager;
