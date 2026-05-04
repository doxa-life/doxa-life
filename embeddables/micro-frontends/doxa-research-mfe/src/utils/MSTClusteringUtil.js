/**
 * MSTClusteringUtil.js
 *
 * Advanced clustering utility using Minimum Spanning Tree (MST) algorithm.
 * Ensures ALL points are connected with NO ORPHANS.
 *
 * Algorithm: Kruskal's MST with Union-Find
 *  - Connects ALL points in a group
 *  - Creates minimum total distance spanning tree
 *  - No orphan dots (every dot is connected)
 *  - More efficient connections than nearest-neighbor
 *  - O(E log E) time complexity where E = number of edges
 *
 * Benefits over NetworkClusteringUtil:
 *  - Guarantees all points are connected (no orphans!)
 *  - Uses fewer lines (only n-1 lines for n points)
 *  - Creates tree structure instead of dense mesh
 *  - Better visual clarity
 *  - No maxDistance parameter needed (connects everything)
 *
 * Ported verbatim from FARFAST3-ETHNOGRAPHIC/MSTClusteringUtil.js (~250 lines)
 * to the Map-Framework template. No external deps beyond ES2020.
 *
 * @module utils/MSTClusteringUtil
 */

import { euclideanDistance } from './ClusterHelpers.js';

/**
 * @typedef {Object} GeoPoint
 * @property {number|string} latitude
 * @property {number|string} longitude
 */

/**
 * @typedef {Object} MSTOptions
 * @property {number} [maxConnectionDistance] - Optional max edge length in degrees (default: Infinity).
 */

/**
 * @typedef {Object} MSTGroupResult
 * @property {Array<Object>} lines        - GeoJSON LineString features
 * @property {number}        count        - Line count
 * @property {number}        pointCount   - Source point count
 */

/**
 * Minimum Spanning Tree clustering utility.
 *
 * @example
 *   const util = new MSTClusteringUtil({ maxConnectionDistance: 30 });
 *   const lines = util.generateMSTLines(points);
 */
export class MSTClusteringUtil {
    /**
     * @param {MSTOptions} [options]
     */
    constructor(options = {}) {
        this.maxConnectionDistance = options.maxConnectionDistance ?? Infinity;
    }

    /**
     * Calculate Euclidean distance (degrees) between two GeoPoints.
     * @private
     * @param {GeoPoint} p1
     * @param {GeoPoint} p2
     * @returns {number}
     */
    _calculateDistance(p1, p2) {
        return euclideanDistance(
            parseFloat(p1.latitude),
            parseFloat(p1.longitude),
            parseFloat(p2.latitude),
            parseFloat(p2.longitude)
        );
    }

    /**
     * Build a Union-Find data structure (path compression + union-by-rank).
     * @private
     * @param {number} size
     * @returns {{find: (x: number) => number, union: (x: number, y: number) => boolean}}
     */
    _createUnionFind(size) {
        const parent = Array.from({ length: size }, (_, i) => i);
        const rank = new Array(size).fill(0);

        const find = (x) => {
            if (parent[x] !== x) {
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        };

        const union = (x, y) => {
            const rootX = find(x);
            const rootY = find(y);

            if (rootX === rootY) return false;

            // Union by rank
            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }

            return true;
        };

        return { find, union };
    }

    /**
     * Generate MST GeoJSON LineString features for a single point group.
     * Guarantees connection of every input point unless maxConnectionDistance
     * splits the group into disconnected components.
     *
     * @param {GeoPoint[]} points
     * @param {MSTOptions} [options]
     * @returns {Array<Object>} GeoJSON LineString features
     */
    generateMSTLines(points, options = {}) {
        const maxConnectionDistance = options.maxConnectionDistance ?? this.maxConnectionDistance;

        if (!points || points.length < 2) return [];

        // Filter out points with invalid coordinates
        const validPoints = points.filter(p => {
            const lat = parseFloat(p.latitude);
            const lng = parseFloat(p.longitude);
            return !isNaN(lat) && !isNaN(lng);
        });

        if (validPoints.length < 2) return [];

        // Step 1: Build all candidate edges
        const edges = [];
        for (let i = 0; i < validPoints.length; i++) {
            for (let j = i + 1; j < validPoints.length; j++) {
                const distance = this._calculateDistance(validPoints[i], validPoints[j]);
                if (distance <= maxConnectionDistance) {
                    edges.push({
                        from: i,
                        to: j,
                        distance,
                        fromPoint: validPoints[i],
                        toPoint: validPoints[j]
                    });
                }
            }
        }

        // Step 2: Sort edges by distance ascending
        edges.sort((a, b) => a.distance - b.distance);

        // Step 3: Kruskal via Union-Find
        const uf = this._createUnionFind(validPoints.length);
        const mstEdges = [];
        let edgesAdded = 0;
        const targetEdges = validPoints.length - 1;

        for (const edge of edges) {
            if (edgesAdded >= targetEdges) break;
            if (uf.union(edge.from, edge.to)) {
                mstEdges.push(edge);
                edgesAdded++;
            }
        }

        // Step 4: Convert to GeoJSON
        const lineFeatures = mstEdges.map(edge => ({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [parseFloat(edge.fromPoint.longitude), parseFloat(edge.fromPoint.latitude)],
                    [parseFloat(edge.toPoint.longitude), parseFloat(edge.toPoint.latitude)]
                ]
            },
            properties: {
                distance: edge.distance,
                algorithm: 'MST'
            }
        }));

        if (mstEdges.length < targetEdges) {
            // Disconnected components — some points were too far apart
            console.warn(
                `[MST] Connected ${edgesAdded + 1} of ${validPoints.length} points. ` +
                `Some points may be too far apart (>${maxConnectionDistance} deg).`
            );
        }

        return lineFeatures;
    }

    /**
     * Generate MST lines for multiple groups, processed largest-first.
     *
     * @param {Object<string, GeoPoint[]>} groups - Map of group name to points
     * @param {(groupName: string) => string|null} [colorFunc] - Color resolver
     * @param {MSTOptions} [options]
     * @returns {Object<string, MSTGroupResult>}
     */
    generateMultiGroupMSTLines(groups, colorFunc = null, options = {}) {
        const results = {};

        const sortedGroupNames = Object.keys(groups).sort(
            (a, b) => groups[b].length - groups[a].length
        );

        for (const groupName of sortedGroupNames) {
            const points = groups[groupName];

            if (!points || points.length < 2) {
                results[groupName] = { lines: [], count: 0, pointCount: points?.length || 0 };
                continue;
            }

            const lines = this.generateMSTLines(points, options);

            if (typeof colorFunc === 'function') {
                const color = colorFunc(groupName);
                lines.forEach(line => {
                    line.properties = { ...line.properties, group: groupName, color };
                });
            } else {
                lines.forEach(line => {
                    line.properties = { ...line.properties, group: groupName };
                });
            }

            results[groupName] = {
                lines,
                count: lines.length,
                pointCount: points.length
            };
        }

        return results;
    }

    /**
     * Flatten multi-group MST results into a single feature array.
     *
     * @param {Object<string, GeoPoint[]>} groups
     * @param {(groupName: string) => string|null} [colorFunc]
     * @param {MSTOptions} [options]
     * @returns {Array<Object>} GeoJSON features
     */
    generateAllMSTLines(groups, colorFunc = null, options = {}) {
        const multiResult = this.generateMultiGroupMSTLines(groups, colorFunc, options);
        const allLines = [];
        for (const groupName in multiResult) {
            allLines.push(...multiResult[groupName].lines);
        }
        return allLines;
    }

    /**
     * Compute statistics for an MST clustering pass (debug/logging aid).
     *
     * @param {Object<string, GeoPoint[]>} groups
     * @param {MSTOptions} [options]
     * @returns {Object} stats
     */
    getMSTStats(groups, options = {}) {
        const multiResult = this.generateMultiGroupMSTLines(groups, null, options);

        let totalLines = 0;
        let totalPoints = 0;
        const groupStats = [];

        for (const groupName in multiResult) {
            const { lines, pointCount } = multiResult[groupName];
            totalLines += lines.length;
            totalPoints += pointCount;

            const expectedLines = Math.max(0, pointCount - 1);
            const coverage = pointCount > 1
                ? ((lines.length / expectedLines) * 100).toFixed(1)
                : 100;

            groupStats.push({
                name: groupName,
                points: pointCount,
                lines: lines.length,
                expected: expectedLines,
                coverage: coverage + '%',
                hasOrphans: lines.length < expectedLines
            });
        }

        groupStats.sort((a, b) => b.points - a.points);
        const totalOrphans = groupStats.filter(g => g.hasOrphans).length;

        return {
            algorithm: 'MST (Minimum Spanning Tree)',
            totalGroups: Object.keys(groups).length,
            totalPoints,
            totalLines,
            expectedLines: Math.max(0, totalPoints - Object.keys(groups).length),
            groupsWithOrphans: totalOrphans,
            allPointsConnected: totalOrphans === 0,
            groups: groupStats
        };
    }
}

/**
 * Default MST clustering instance with no maxConnectionDistance limit.
 * @type {MSTClusteringUtil}
 */
export const defaultMSTClustering = new MSTClusteringUtil();

export default MSTClusteringUtil;
