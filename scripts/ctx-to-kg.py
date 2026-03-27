#!/usr/bin/env python3
"""
.ctx → SQLite Knowledge Graph + Contextual Embeddings
=====================================================
Parses all .ctx files in the project, builds a unified KG in SQLite,
and generates contextual embeddings for each node.

Embeddings are "contextual" in the data-packet sense: each node's vector
encodes not just its own text, but its graph neighborhood (connected nodes,
edge types, group membership). This is the E(x, C) → R^d mapping.

Usage:
  python3 scripts/ctx-to-kg.py                    # build KG + embeddings
  python3 scripts/ctx-to-kg.py --query "voice"    # quick semantic search
  python3 scripts/ctx-to-kg.py --stats            # print KG statistics
"""

import sqlite3
import json
import re
import os
import sys
import math
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

# ============================================================================
# .ctx PARSER
# ============================================================================

def parse_ctx_file(filepath: str) -> Tuple[List[dict], List[dict]]:
    """Parse a .ctx file into nodes and edges."""
    nodes = []
    edges = []
    current_group = None
    current_node = None
    source_file = str(filepath)

    with open(filepath, 'r') as f:
        lines = f.readlines()

    for line in lines:
        stripped = line.rstrip()

        # Skip empty lines and comments
        if not stripped or stripped.startswith('# '):
            # Extract metadata from header
            continue

        # Group headers: ## Group Name or ### Sub-Group
        group_match = re.match(r'^(#{2,3})\s+(.+)', stripped)
        if group_match:
            current_group = group_match.group(2).strip()
            current_node = None
            continue

        # Node definition:   NodeName : description [type]
        node_match = re.match(r'^(\s+)(\S+)\s*:\s*(.+?)(?:\s+\[(\w+)\])?\s*(@\w+)?\s*$', stripped)
        if node_match:
            indent = node_match.group(1)
            name = node_match.group(2)
            description = node_match.group(3).strip()
            node_type = node_match.group(4) or 'component'
            marker = node_match.group(5) or ''

            node = {
                'id': f"{source_file}:{name}",
                'name': name,
                'type': node_type,
                'description': description,
                'group': current_group or '',
                'source_file': source_file,
                'marker': marker.strip(),
            }
            nodes.append(node)
            current_node = node
            continue

        # Edge lines:     -> target1, target2  or  ~> target  or  => target
        edge_match = re.match(r'^\s+(->|~>|=>)\s+(.+)', stripped)
        if edge_match and current_node:
            edge_type_symbol = edge_match.group(1)
            targets_str = edge_match.group(2)

            edge_type_map = {'->': 'call', '~>': 'subscribe', '=>': 'http'}
            edge_type = edge_type_map.get(edge_type_symbol, 'unknown')

            # Parse targets (comma-separated, may have labels in quotes)
            targets = re.split(r',\s*', targets_str)
            for target in targets:
                target_name = re.sub(r'\s*"[^"]*"\s*', '', target).strip()
                if target_name:
                    edges.append({
                        'from_node': current_node['name'],
                        'to_node': target_name,
                        'type': edge_type,
                        'source_file': source_file,
                    })
            continue

        # Collapse syntax: ... (N) : name1, name2 [type]
        collapse_match = re.match(r'^\s+\.\.\.\s+\((\d+)\)\s*:\s*(.+?)(?:\s+\[(\w+)\])?\s*$', stripped)
        if collapse_match:
            count = int(collapse_match.group(1))
            names_str = collapse_match.group(2)
            node_type = collapse_match.group(3) or 'component'
            names = [n.strip() for n in names_str.split(',')]
            for name in names:
                if name:
                    node = {
                        'id': f"{source_file}:{name}",
                        'name': name,
                        'type': node_type,
                        'description': f'(collapsed, part of {count}-node group)',
                        'group': current_group or '',
                        'source_file': source_file,
                        'marker': '',
                    }
                    nodes.append(node)
            continue

    return nodes, edges


def find_all_ctx_files(root: str) -> List[str]:
    """Find all .ctx files, excluding node_modules etc."""
    ctx_files = []
    exclude = {'node_modules', '.git', '.next', '__pycache__', 'dist', 'build'}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude]
        for f in filenames:
            if f.endswith('.ctx'):
                ctx_files.append(os.path.join(dirpath, f))
    return sorted(ctx_files)


# ============================================================================
# SQLITE KG BUILDER
# ============================================================================

def build_kg(root: str, db_path: str) -> Tuple[int, int]:
    """Parse all .ctx files and build unified SQLite KG."""
    ctx_files = find_all_ctx_files(root)
    all_nodes = []
    all_edges = []

    for filepath in ctx_files:
        nodes, edges = parse_ctx_file(filepath)
        all_nodes.extend(nodes)
        all_edges.extend(edges)

    # Deduplicate nodes by name (keep first occurrence with richest description)
    seen = {}
    unique_nodes = []
    for node in all_nodes:
        name = node['name']
        if name not in seen or len(node['description']) > len(seen[name]['description']):
            seen[name] = node
    unique_nodes = list(seen.values())

    # Resolve edge node IDs (match by name)
    node_names = {n['name'] for n in unique_nodes}

    # Create database
    conn = sqlite3.connect(db_path)
    conn.execute("DROP TABLE IF EXISTS nodes")
    conn.execute("DROP TABLE IF EXISTS edges")

    conn.execute("""
        CREATE TABLE nodes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            description TEXT,
            "group" TEXT,
            source_file TEXT,
            source_kg TEXT DEFAULT 'auto',
            marker TEXT
        )
    """)

    conn.execute("""
        CREATE TABLE edges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_node TEXT NOT NULL,
            to_node TEXT NOT NULL,
            type TEXT NOT NULL,
            source_file TEXT,
            source_kg TEXT DEFAULT 'auto',
            weight REAL DEFAULT 1.0
        )
    """)

    # Insert nodes
    for node in unique_nodes:
        conn.execute(
            'INSERT OR REPLACE INTO nodes (id, name, type, description, "group", source_file, source_kg, marker) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            (node['name'], node['name'], node['type'], node['description'],
             node['group'], node['source_file'], 'auto', node['marker'])
        )

    # Insert edges (only if both endpoints exist)
    edge_count = 0
    for edge in all_edges:
        if edge['from_node'] in node_names and edge['to_node'] in node_names:
            conn.execute(
                'INSERT INTO edges (from_node, to_node, type, source_file, source_kg) VALUES (?, ?, ?, ?, ?)',
                (edge['from_node'], edge['to_node'], edge['type'], edge['source_file'], 'auto')
            )
            edge_count += 1

    conn.commit()
    conn.close()

    return len(unique_nodes), edge_count


# ============================================================================
# CONTEXTUAL EMBEDDING GENERATOR
# ============================================================================

def generate_embeddings(db_path: str, output_path: str, dim: int = 50):
    """
    Generate contextual embeddings for each node.

    "Contextual" means each node's embedding encodes:
    1. Its own text (name + description) — the token embedding
    2. Its type tag — structural role
    3. Its group membership — hierarchical position
    4. Its graph neighborhood — connected nodes' text (the CONTEXT)

    This is E(x, C) → R^d from the data packet, implemented as
    hash-based feature vectors with neighborhood aggregation.
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    # Load all nodes
    nodes = {row['name']: dict(row) for row in conn.execute("SELECT * FROM nodes")}

    # Build adjacency lists
    outgoing = defaultdict(list)  # node → [(target, edge_type)]
    incoming = defaultdict(list)  # node → [(source, edge_type)]
    for row in conn.execute("SELECT * FROM edges"):
        outgoing[row['from_node']].append((row['to_node'], row['type']))
        incoming[row['to_node']].append((row['from_node'], row['type']))

    # Build vocabulary from all text
    all_tokens = set()
    for node in nodes.values():
        tokens = tokenize(node['name']) + tokenize(node.get('description', ''))
        tokens += tokenize(node.get('type', '')) + tokenize(node.get('group', ''))
        all_tokens.update(tokens)

    # Add edge-type tokens
    all_tokens.update(['_call_neighbor', '_subscribe_neighbor', '_http_neighbor',
                       '_is_called_by', '_is_subscribed_by', '_is_http_target',
                       '_type_root', '_type_component', '_type_store', '_type_lib',
                       '_type_service', '_type_router', '_type_backend', '_type_screen',
                       '_type_ext', '_type_dir', '_type_config', '_type_data',
                       '_entry_point', '_group_member'])

    vocab = sorted(all_tokens)
    vocab_idx = {t: i for i, t in enumerate(vocab)}

    # Generate raw feature vectors
    raw_vectors = {}
    for name, node in nodes.items():
        vec = [0.0] * len(vocab)

        # 1. Self tokens (weight: 1.0)
        self_tokens = tokenize(name) + tokenize(node.get('description', ''))
        for t in self_tokens:
            if t in vocab_idx:
                vec[vocab_idx[t]] += 1.0

        # 2. Type signal (weight: 2.0 — structural role matters)
        type_token = f"_type_{node.get('type', 'component')}"
        if type_token in vocab_idx:
            vec[vocab_idx[type_token]] += 2.0

        # 3. Entry point marker (weight: 1.5)
        if node.get('marker') and 'entry' in node.get('marker', ''):
            if '_entry_point' in vocab_idx:
                vec[vocab_idx['_entry_point']] += 1.5

        # 4. Group membership (weight: 0.5)
        group_tokens = tokenize(node.get('group', ''))
        for t in group_tokens:
            if t in vocab_idx:
                vec[vocab_idx[t]] += 0.5

        # 5. CONTEXTUAL: outgoing neighbors (weight: 0.7)
        for target, edge_type in outgoing.get(name, []):
            neighbor_type_token = f"_{edge_type}_neighbor"
            if neighbor_type_token in vocab_idx:
                vec[vocab_idx[neighbor_type_token]] += 0.7
            # Add neighbor's name tokens (the contextual signal)
            if target in nodes:
                for t in tokenize(target) + tokenize(nodes[target].get('description', '')):
                    if t in vocab_idx:
                        vec[vocab_idx[t]] += 0.3  # Diluted neighbor signal

        # 6. CONTEXTUAL: incoming neighbors (weight: 0.5)
        for source, edge_type in incoming.get(name, []):
            inv_token = f"_is_{edge_type}d_by" if edge_type != 'http' else '_is_http_target'
            if edge_type == 'call':
                inv_token = '_is_called_by'
            elif edge_type == 'subscribe':
                inv_token = '_is_subscribed_by'
            if inv_token in vocab_idx:
                vec[vocab_idx[inv_token]] += 0.5
            if source in nodes:
                for t in tokenize(source):
                    if t in vocab_idx:
                        vec[vocab_idx[t]] += 0.2

        raw_vectors[name] = vec

    # Reduce dimensionality via random projection (fast, preserves distances)
    import random
    random.seed(42)

    projection = [[random.gauss(0, 1.0 / math.sqrt(dim)) for _ in range(len(vocab))] for _ in range(dim)]

    embeddings = {}
    for name, vec in raw_vectors.items():
        projected = [0.0] * dim
        for d in range(dim):
            for i, v in enumerate(vec):
                if v != 0:
                    projected[d] += projection[d][i] * v
        # L2 normalize
        norm = math.sqrt(sum(x*x for x in projected))
        if norm > 0:
            projected = [x / norm for x in projected]
        embeddings[name] = projected

    # Save embeddings
    emb_data = {
        'nodes': [
            {
                'node_id': name,
                'dimensions': {f"d{i}": v for i, v in enumerate(emb)}
            }
            for name, emb in embeddings.items()
        ],
        'metadata': {
            'dim': dim,
            'node_count': len(embeddings),
            'vocab_size': len(vocab),
            'method': 'contextual_hash_projection',
        }
    }

    os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(emb_data, f, indent=2)

    conn.close()
    return len(embeddings)


def tokenize(text: str) -> List[str]:
    """Simple tokenizer: lowercase, split on non-alphanumeric, filter short."""
    if not text:
        return []
    tokens = re.findall(r'[a-z][a-z0-9]+', text.lower())
    return [t for t in tokens if len(t) > 1]


# ============================================================================
# QUICK QUERY (standalone, no kg-ask.py needed)
# ============================================================================

def _load_kg_and_embeddings(db_path: str, embeddings_path: str):
    """Load KG nodes and embeddings from disk."""
    with open(embeddings_path, 'r') as f:
        emb_data = json.load(f)

    embeddings = {}
    for node in emb_data['nodes']:
        dims = node['dimensions']
        vec = [dims[f"d{i}"] for i in range(len(dims))]
        embeddings[node['node_id']] = vec

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    nodes = {row['name']: dict(row) for row in conn.execute("SELECT * FROM nodes")}

    return nodes, embeddings, conn


def _score_query(query: str, nodes: dict, embeddings: dict, conn, top_k: int = 15) -> Dict:
    """Score nodes by text match + embedding similarity + graph proximity. Returns structured results."""
    query_tokens = set(tokenize(query))

    # Stage 1: Text matching
    text_scores = {}
    for name, node in nodes.items():
        node_tokens = set(tokenize(name) + tokenize(node.get('description', '')))
        overlap = query_tokens & node_tokens
        if overlap:
            text_scores[name] = len(overlap) / max(len(query_tokens), 1)

    # Stage 2: Embedding similarity to text-match anchors
    embedding_scores = {}
    if text_scores:
        text_anchors = sorted(text_scores, key=text_scores.get, reverse=True)[:5]
        for anchor in text_anchors:
            if anchor not in embeddings:
                continue
            anchor_vec = embeddings[anchor]
            for other_name, other_vec in embeddings.items():
                if other_name == anchor:
                    continue
                sim = cosine_sim(anchor_vec, other_vec)
                if sim > 0.3:
                    embedding_scores[other_name] = max(embedding_scores.get(other_name, 0), sim)

    # Stage 3: Graph expansion from text-match anchors
    graph_scores = {}
    if text_scores:
        text_anchors = sorted(text_scores, key=text_scores.get, reverse=True)[:5]
        for anchor in text_anchors:
            for row in conn.execute("SELECT to_node, type FROM edges WHERE from_node = ?", (anchor,)):
                n = row['to_node']
                graph_scores[n] = max(graph_scores.get(n, 0), 0.8)
            for row in conn.execute("SELECT from_node, type FROM edges WHERE to_node = ?", (anchor,)):
                n = row['from_node']
                graph_scores[n] = max(graph_scores.get(n, 0), 0.7)

            one_hop = set()
            for row in conn.execute("SELECT to_node FROM edges WHERE from_node = ?", (anchor,)):
                one_hop.add(row['to_node'])
            for row in conn.execute("SELECT from_node FROM edges WHERE to_node = ?", (anchor,)):
                one_hop.add(row['from_node'])

            for hop1 in one_hop:
                for row in conn.execute("SELECT to_node FROM edges WHERE from_node = ?", (hop1,)):
                    n = row['to_node']
                    if n not in text_scores:
                        graph_scores[n] = max(graph_scores.get(n, 0), 0.4)
                for row in conn.execute("SELECT from_node FROM edges WHERE to_node = ?", (hop1,)):
                    n = row['from_node']
                    if n not in text_scores:
                        graph_scores[n] = max(graph_scores.get(n, 0), 0.35)

    # Combine scores
    all_names = set(text_scores) | set(embedding_scores) | set(graph_scores)
    results = []
    for name in all_names:
        t = text_scores.get(name, 0)
        e = embedding_scores.get(name, 0)
        g = graph_scores.get(name, 0)
        total = t * 1.0 + e * 0.6 + g * 0.8
        node = nodes.get(name, {})
        results.append({
            'name': name,
            'type': node.get('type', 'unknown'),
            'description': node.get('description', ''),
            'group': node.get('group', ''),
            'source_file': node.get('source_file', ''),
            'score': round(total, 4),
            'sources': {
                'text': round(t, 4) if t > 0 else None,
                'embed': round(e, 4) if e > 0 else None,
                'graph': round(g, 4) if g > 0 else None,
            }
        })

    results.sort(key=lambda x: -x['score'])
    results = results[:top_k]

    graph_only = set(graph_scores) - set(text_scores)
    embed_only = set(embedding_scores) - set(text_scores) - set(graph_scores)

    return {
        'query': query,
        'results': results,
        'metadata': {
            'text_matches': len(text_scores),
            'embed_neighbors': len(embedding_scores),
            'graph_connected': len(graph_scores),
            'grep_would_miss': len(graph_only) + len(embed_only),
            'grep_would_miss_graph': len(graph_only),
            'grep_would_miss_embed': len(embed_only),
        }
    }


def quick_query(db_path: str, embeddings_path: str, query: str, top_k: int = 15, output_format: str = 'text'):
    """Quick semantic + graph search. Returns structured data or prints formatted text."""
    nodes, embeddings, conn = _load_kg_and_embeddings(db_path, embeddings_path)
    result = _score_query(query, nodes, embeddings, conn, top_k)
    conn.close()

    if output_format == 'json':
        # Clean None values from sources for compact JSON
        for r in result['results']:
            r['sources'] = {k: v for k, v in r['sources'].items() if v is not None}
        print(json.dumps(result))
        return result

    # Text format (original behavior)
    meta = result['metadata']
    print(f"\n{'='*70}")
    print(f"  Query: \"{query}\"")
    print(f"  Text matches: {meta['text_matches']} | Embedding neighbors: {meta['embed_neighbors']} | Graph connected: {meta['graph_connected']}")
    print(f"{'='*70}\n")

    for i, r in enumerate(result['results'], 1):
        sources_str = ', '.join(f"{k}:{v:.2f}" for k, v in r['sources'].items() if v)
        desc = r['description'][:60]
        print(f"  {i:2d}. {r['name']:<30s} [{r['type']}]  score={r['score']:.3f}")
        print(f"      {desc}")
        print(f"      via: {sources_str}")
        print()

    if not result['results']:
        print("  No results found.")

    if meta['grep_would_miss'] > 0:
        print(f"  --- grep would miss {meta['grep_would_miss']} of these results ---")
        print(f"      Graph-only (structurally connected): {meta['grep_would_miss_graph']}")
        print(f"      Embedding-only (semantically similar): {meta['grep_would_miss_embed']}")

    return result


# ============================================================================
# IMPACT ANALYSIS — reverse traversal from a target node
# ============================================================================

def impact_query(db_path: str, embeddings_path: str, target_name: str, top_k: int = 25, output_format: str = 'text'):
    """Find everything that depends on a target node. Groups by risk level."""
    nodes, embeddings, conn = _load_kg_and_embeddings(db_path, embeddings_path)

    # Find target node (exact match, fallback to fuzzy)
    target = None
    if target_name in nodes:
        target = target_name
    else:
        # Fuzzy: find best token overlap
        query_tokens = set(tokenize(target_name))
        best_score, best_name = 0, None
        for name in nodes:
            overlap = query_tokens & set(tokenize(name))
            if len(overlap) > best_score:
                best_score = len(overlap)
                best_name = name
        target = best_name

    if not target or target not in nodes:
        result = {'query': target_name, 'target': None, 'error': f'Node "{target_name}" not found', 'results': []}
        if output_format == 'json':
            print(json.dumps(result))
        else:
            print(f"\n  Node \"{target_name}\" not found in KG.")
        return result

    target_node = nodes[target]

    # Hop 1: direct dependents (HIGH risk)
    high_risk = []
    hop1_names = set()
    for row in conn.execute("SELECT from_node, type FROM edges WHERE to_node = ?", (target,)):
        name = row['from_node']
        if name != target and name in nodes:
            hop1_names.add(name)
            high_risk.append({
                'name': name,
                'type': nodes[name].get('type', 'unknown'),
                'description': nodes[name].get('description', ''),
                'source_file': nodes[name].get('source_file', ''),
                'edge_type': row['type'],
                'risk': 'high',
                'path': f"{name} --{row['type']}--> {target}",
            })

    # Hop 2: transitive dependents (MEDIUM risk)
    medium_risk = []
    for hop1 in hop1_names:
        for row in conn.execute("SELECT from_node, type FROM edges WHERE to_node = ?", (hop1,)):
            name = row['from_node']
            if name != target and name not in hop1_names and name in nodes:
                medium_risk.append({
                    'name': name,
                    'type': nodes[name].get('type', 'unknown'),
                    'description': nodes[name].get('description', ''),
                    'source_file': nodes[name].get('source_file', ''),
                    'edge_type': row['type'],
                    'risk': 'medium',
                    'path': f"{name} --{row['type']}--> {hop1} --X--> {target}",
                })

    # Deduplicate medium risk
    seen_medium = set()
    unique_medium = []
    for r in medium_risk:
        if r['name'] not in seen_medium:
            seen_medium.add(r['name'])
            unique_medium.append(r)
    medium_risk = unique_medium

    # Embedding similarity: indirect dependents (not in graph)
    graph_found = hop1_names | seen_medium | {target}
    indirect = []
    if target in embeddings:
        target_vec = embeddings[target]
        for name, vec in embeddings.items():
            if name in graph_found:
                continue
            sim = cosine_sim(target_vec, vec)
            if sim > 0.4:
                indirect.append({
                    'name': name,
                    'type': nodes.get(name, {}).get('type', 'unknown'),
                    'description': nodes.get(name, {}).get('description', ''),
                    'source_file': nodes.get(name, {}).get('source_file', ''),
                    'similarity': round(sim, 4),
                    'risk': 'indirect',
                    'path': f"{name} ~~ similar embedding ~~ {target}",
                })
        indirect.sort(key=lambda x: -x['similarity'])
        indirect = indirect[:top_k]

    conn.close()

    result = {
        'query': target_name,
        'target': {
            'name': target,
            'type': target_node.get('type', 'unknown'),
            'description': target_node.get('description', ''),
        },
        'impact': {
            'high': high_risk,
            'medium': medium_risk,
            'indirect': indirect,
        },
        'metadata': {
            'high_count': len(high_risk),
            'medium_count': len(medium_risk),
            'indirect_count': len(indirect),
            'total': len(high_risk) + len(medium_risk) + len(indirect),
        }
    }

    if output_format == 'json':
        print(json.dumps(result))
        return result

    # Text format
    t = result['target']
    meta = result['metadata']
    print(f"\n{'='*70}")
    print(f"  Impact analysis: \"{t['name']}\" [{t['type']}]")
    print(f"  {t['description'][:60]}")
    print(f"  Total affected: {meta['total']} ({meta['high_count']} high, {meta['medium_count']} medium, {meta['indirect_count']} indirect)")
    print(f"{'='*70}")

    if high_risk:
        print(f"\n  HIGH RISK — direct dependents (will break if changed):")
        for i, r in enumerate(high_risk, 1):
            print(f"    {i:2d}. {r['name']:<28s} [{r['type']}] via {r['edge_type']}")
            print(f"        {r['description'][:55]}")

    if medium_risk:
        print(f"\n  MEDIUM RISK — transitive (2 hops away):")
        for i, r in enumerate(medium_risk[:15], 1):
            print(f"    {i:2d}. {r['name']:<28s} [{r['type']}] via {r['edge_type']}")
            print(f"        {r['path']}")

    if indirect:
        print(f"\n  INDIRECT — semantically similar (may need review):")
        for i, r in enumerate(indirect[:10], 1):
            print(f"    {i:2d}. {r['name']:<28s} [{r['type']}] similarity={r['similarity']:.3f}")

    if meta['total'] == 0:
        print(f"\n  No dependents found — this node is a leaf or isolated.")

    return result


def cosine_sim(a, b):
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a))
    nb = math.sqrt(sum(x*x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description=".ctx → SQLite KG + Contextual Embeddings")
    parser.add_argument('--root', default='.', help='Project root (default: current dir)')
    parser.add_argument('--db', default='ctx-kg.db', help='Output SQLite path (default: ctx-kg.db)')
    parser.add_argument('--embeddings', default='data/ctx_embeddings.json', help='Output embeddings path')
    parser.add_argument('--dim', type=int, default=50, help='Embedding dimensions (default: 50)')
    parser.add_argument('--query', '-q', type=str, help='Quick semantic search query')
    parser.add_argument('--impact', action='store_true', help='Impact analysis mode (reverse traversal from target)')
    parser.add_argument('--format', choices=['text', 'json'], default='text', help='Output format (default: text)')
    parser.add_argument('--stats', action='store_true', help='Print KG statistics')
    parser.add_argument('--top-k', type=int, default=15, help='Top-k results for query')
    args = parser.parse_args()

    db_path = os.path.join(args.root, args.db)
    emb_path = os.path.join(args.root, args.embeddings)

    # If just querying, skip build if DB exists
    if args.query and os.path.exists(db_path) and os.path.exists(emb_path):
        if args.impact:
            impact_query(db_path, emb_path, args.query, args.top_k, args.format)
        else:
            quick_query(db_path, emb_path, args.query, args.top_k, args.format)
        return

    # Build KG
    print("Parsing .ctx files...")
    ctx_files = find_all_ctx_files(args.root)
    print(f"  Found {len(ctx_files)} .ctx files")

    node_count, edge_count = build_kg(args.root, db_path)
    print(f"  Built KG: {node_count} nodes, {edge_count} edges → {db_path}")

    # Generate embeddings
    print("Generating contextual embeddings...")
    emb_count = generate_embeddings(db_path, emb_path, dim=args.dim)
    print(f"  Generated {emb_count} embeddings ({args.dim}d) → {emb_path}")

    # Stats
    if args.stats or not args.query:
        conn = sqlite3.connect(db_path)
        print(f"\n{'='*50}")
        print(f"  Knowledge Graph Statistics")
        print(f"{'='*50}")
        print(f"  Nodes: {node_count}")
        print(f"  Edges: {edge_count}")

        # Type distribution
        for row in conn.execute("SELECT type, COUNT(*) as c FROM nodes GROUP BY type ORDER BY c DESC"):
            print(f"    [{row[0]}] {row[1]}")

        # Edge type distribution
        print(f"\n  Edge types:")
        for row in conn.execute("SELECT type, COUNT(*) as c FROM edges GROUP BY type ORDER BY c DESC"):
            print(f"    {row[0]}: {row[1]}")

        # Source files
        print(f"\n  Source .ctx files: {len(ctx_files)}")
        conn.close()

    # Run query if provided
    if args.query:
        quick_query(db_path, emb_path, args.query, args.top_k, args.format)


if __name__ == "__main__":
    main()
