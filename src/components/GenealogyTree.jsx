import React from 'react';
import { proxyImageUrl } from '../utils/imageProxy';

/*
 * Traditional Vietnamese Genealogy Tree
 * - Top-down layout with ancestor at top center
 * - Altar/tombstone-style photo frames
 * - Clean vertical/horizontal connectors
 * - Pan & zoom support
 */

const NODE_W = 110;
const NODE_H = 150;
const H_GAP = 30;
const V_GAP = 50;
const PHOTO_SIZE = 60;
const FRAME_W = 80;
const FRAME_H = 100;

export default function GenealogyTree({ members = [], onSelect }) {
  const containerRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [positions, setPositions] = React.useState({});
  const [connectors, setConnectors] = React.useState({ paths: [], hearts: [] });
  const [canvasSize, setCanvasSize] = React.useState({ w: 800, h: 600 });
  const [tooltip, setTooltip] = React.useState(null);

  // Pan/zoom stored in ref to avoid re-renders on every mouse move
  const viewRef = React.useRef({ scale: 0.85, tx: 0, ty: 0 });
  const rafId = React.useRef(null);
  const isPanning = React.useRef(false);
  const didDrag = React.useRef(false);
  const lastPan = React.useRef({ x: 0, y: 0 });
  // State copies used only for zoom button UI triggers
  const [, forceUpdate] = React.useState(0);

  // Build person map
  const mapById = React.useMemo(() => {
    const m = new Map();
    members.forEach((it) => m.set(it.id, it));
    return m;
  }, [members]);

  // Build spouse groups — supports N spouses (polygamy)
  const { groups, groupByMember } = React.useMemo(() => {
    const assigned = new Set();
    const groups = new Map();
    const groupByMember = new Map();

    // Collect the full connected spouse cluster for a person
    function collectCluster(startId, visited = new Set()) {
      if (visited.has(startId)) return;
      visited.add(startId);
      const p = mapById.get(startId);
      if (!p) return;
      for (const sid of (p.voChongIds || [])) {
        if (mapById.has(sid)) collectCluster(sid, visited);
      }
      return visited;
    }

    members.forEach((p) => {
      if (assigned.has(p.id)) return;
      const cluster = collectCluster(p.id);
      if (!cluster) return;

      const ids = Array.from(cluster);

      // Find the "hub" person — the one with the most spouse connections
      ids.sort((a, b) => {
        const sa = (mapById.get(a)?.voChongIds || []).length;
        const sb = (mapById.get(b)?.voChongIds || []).length;
        return sb - sa;
      });
      const hubId = ids[0];
      const spouseIds = ids.filter((id) => id !== hubId);

      // Arrange: distribute spouses around the hub (center)
      // Result: [spouse0, spouse2, ...] hub [spouse1, spouse3, ...]
      const left = [];
      const right = [];
      spouseIds.forEach((id, i) => {
        if (i % 2 === 0) left.push(id);
        else right.push(id);
      });
      const ordered = [...left, hubId, ...right];

      const gid = `g:${ordered.join('|')}`;
      const memberList = ordered.map((id) => mapById.get(id)).filter(Boolean);
      groups.set(gid, memberList);
      for (const id of ordered) {
        groupByMember.set(id, gid);
        assigned.add(id);
      }
    });
    return { groups, groupByMember };
  }, [members, mapById]);

  // Build parent->children map
  const childrenGroupMap = React.useMemo(() => {
    const cm = new Map();
    for (const [gId, mList] of groups.entries()) {
      let parentId = '__root__';
      for (const m of mList || []) {
        if (m && m.chaId) { parentId = m.chaId; break; }
      }
      if (parentId === '__root__') {
        for (const m of mList || []) {
          if (m && m.meId && mapById.has(m.meId)) { parentId = m.meId; break; }
        }
      }
      const parentGroup = parentId === '__root__' ? '__root__' : groupByMember.get(parentId) || `g:${parentId}`;
      if (!cm.has(parentGroup)) cm.set(parentGroup, []);
      const arr = cm.get(parentGroup);
      if (!arr.includes(gId)) arr.push(gId);
    }
    return cm;
  }, [members, groups, groupByMember, mapById]);

  // Sort children by thuTuCon
  React.useMemo(() => {
    for (const [, children] of childrenGroupMap.entries()) {
      children.sort((a, b) => {
        const aList = groups.get(a) || [];
        const bList = groups.get(b) || [];
        const aOrder = Math.min(...aList.map(m => m.thuTuCon || 999));
        const bOrder = Math.min(...bList.map(m => m.thuTuCon || 999));
        return aOrder - bOrder;
      });
    }
  }, [childrenGroupMap, groups]);

  const roots = React.useMemo(
    () => childrenGroupMap.get('__root__') || Array.from(groups.keys()),
    [childrenGroupMap, groups]
  );

  // Layout computation
  React.useEffect(() => {
    if (!members || members.length === 0) return;

    const pos = {};
    const groupNodeW = (gId) => {
      const mList = groups.get(gId) || [];
      const count = mList.length || 1;
      return count * NODE_W + (count - 1) * H_GAP;
    };

    // Compute subtree widths
    const subtreeW = new Map();
    function computeWidth(gId) {
      if (subtreeW.has(gId)) return subtreeW.get(gId);
      const children = childrenGroupMap.get(gId) || [];
      const selfW = groupNodeW(gId);
      if (children.length === 0) {
        subtreeW.set(gId, selfW);
        return selfW;
      }
      let totalChildW = 0;
      for (const c of children) {
        totalChildW += computeWidth(c);
      }
      totalChildW += (children.length - 1) * H_GAP;
      const w = Math.max(selfW, totalChildW);
      subtreeW.set(gId, w);
      return w;
    }

    // Assign positions
    function assignPos(gId, left, depth) {
      const sw = subtreeW.get(gId) || NODE_W;
      const selfW = groupNodeW(gId);
      const x = left + (sw - selfW) / 2;
      const y = 40 + depth * (NODE_H + V_GAP);
      pos[gId] = { x, y, w: selfW };

      const children = childrenGroupMap.get(gId) || [];
      let cx = left;
      for (const c of children) {
        const cw = subtreeW.get(c) || NODE_W;
        assignPos(c, cx, depth + 1);
        cx += cw + H_GAP;
      }
    }

    // Compute all widths first
    let totalRootW = 0;
    for (const r of roots) {
      computeWidth(r);
      totalRootW += subtreeW.get(r) || NODE_W;
    }
    totalRootW += (roots.length - 1) * H_GAP * 2;

    // Assign positions for all roots
    let cursorX = 40;
    for (const r of roots) {
      const rw = subtreeW.get(r) || NODE_W;
      assignPos(r, cursorX, 0);
      cursorX += rw + H_GAP * 2;
    }

    // Compute max bounds
    let maxX = 0, maxDepth = 0;
    for (const [gId, p] of Object.entries(pos)) {
      maxX = Math.max(maxX, p.x + (p.w || NODE_W) + 40);
      const depth = Math.round((p.y - 40) / (NODE_H + V_GAP));
      maxDepth = Math.max(maxDepth, depth);
    }

    setPositions(pos);
    setCanvasSize({
      w: Math.max(maxX + 80, 800),
      h: Math.max((maxDepth + 1) * (NODE_H + V_GAP) + 120, 600),
    });

    // Build connectors
    const paths = [];
    for (const [gId] of groups.entries()) {
      const pPos = pos[gId];
      if (!pPos) continue;
      const children = childrenGroupMap.get(gId) || [];
      if (children.length === 0) continue;

      const pCenterX = pPos.x + pPos.w / 2;
      const pBottom = pPos.y + FRAME_H + 16;

      // Collect child center positions
      const childCenters = [];
      for (const cGid of children) {
        const cPos = pos[cGid];
        if (!cPos) continue;
        const cx = cPos.x + cPos.w / 2;
        const cy = cPos.y;
        childCenters.push({ id: cGid, x: cx, y: cy });
      }
      if (childCenters.length === 0) continue;

      if (childCenters.length === 1) {
        const ch = childCenters[0];
        paths.push({
          key: `${gId}->${ch.id}`,
          d: `M ${pCenterX} ${pBottom} L ${pCenterX} ${(pBottom + ch.y) / 2} L ${ch.x} ${(pBottom + ch.y) / 2} L ${ch.x} ${ch.y}`,
          type: 'child',
        });
      } else {
        const spineY = pBottom + (childCenters[0].y - pBottom) * 0.45;
        const xs = childCenters.map((c) => c.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        // Parent down to spine
        paths.push({
          key: `${gId}->spine`,
          d: `M ${pCenterX} ${pBottom} L ${pCenterX} ${spineY}`,
          type: 'child',
        });
        // Horizontal spine
        paths.push({
          key: `${gId}->spine-h`,
          d: `M ${minX} ${spineY} L ${maxX} ${spineY}`,
          type: 'child',
        });
        // Verticals to each child
        for (const ch of childCenters) {
          paths.push({
            key: `${gId}->${ch.id}-v`,
            d: `M ${ch.x} ${spineY} L ${ch.x} ${ch.y}`,
            type: 'child',
          });
        }
      }
    }

    // Spouse connectors + hearts — supports N spouses per group
    const spouseHearts = [];
    for (const [gId, mList] of groups.entries()) {
      if (mList.length < 2) continue;
      const pPos = pos[gId];
      if (!pPos) continue;
      const y = pPos.y + FRAME_H / 2;

      // Draw connector + heart between each consecutive pair
      for (let i = 0; i < mList.length - 1; i++) {
        const x1 = pPos.x + i * (NODE_W + H_GAP) + NODE_W / 2;
        const x2 = pPos.x + (i + 1) * (NODE_W + H_GAP) + NODE_W / 2;
        const midX = (x1 + x2) / 2;

        // Left segment (node → heart)
        paths.push({
          key: `spouse-l-${gId}-${i}`,
          d: `M ${x1 + 10} ${y} L ${midX - 12} ${y}`,
          type: 'spouse',
        });
        // Right segment (heart → node)
        paths.push({
          key: `spouse-r-${gId}-${i}`,
          d: `M ${midX + 12} ${y} L ${x2 - 10} ${y}`,
          type: 'spouse',
        });
        // Heart position
        spouseHearts.push({ key: `heart-${gId}-${i}`, x: midX, y });
      }
    }

    setConnectors({ paths, hearts: spouseHearts });
  }, [members, childrenGroupMap, roots, groups]);

  // Helper: apply the current viewRef transform directly to the canvas DOM
  const applyTransform = React.useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const { tx, ty, scale } = viewRef.current;
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, []);

  // Pan/zoom handlers
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e) => {
      // Don't start panning immediately — just record the start point.
      // Actual panning starts in onPointerMove if the pointer moves enough.
      isPanning.current = false;
      didDrag.current = false;
      lastPan.current = { x: e.clientX, y: e.clientY };
      // Store pointer id so we can capture later
      container._pendingPointerId = e.pointerId;
    };
    const onPointerMove = (e) => {
      if (container._pendingPointerId == null && !isPanning.current) return;
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;

      // Lazy start: only begin panning after moving > 3px (avoids blocking clicks)
      if (!isPanning.current) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        isPanning.current = true;
        didDrag.current = true;
        try { container.setPointerCapture(container._pendingPointerId); } catch (_) {}
        container._pendingPointerId = null;
      }

      lastPan.current = { x: e.clientX, y: e.clientY };
      viewRef.current.tx += dx;
      viewRef.current.ty += dy;
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          applyTransform();
          rafId.current = null;
        });
      }
    };
    const onPointerUp = (e) => {
      if (isPanning.current) {
        try { container.releasePointerCapture(e.pointerId); } catch (_) {}
      }
      isPanning.current = false;
      container._pendingPointerId = null;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY < 0 ? 1.08 : 0.92;
      const v = viewRef.current;
      const ns = Math.min(3, Math.max(0.2, v.scale * delta));
      v.tx = (v.tx - mx) * (ns / v.scale) + mx;
      v.ty = (v.ty - my) * (ns / v.scale) + my;
      v.scale = ns;
      applyTransform();
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [applyTransform]);

  // Zoom controls
  const zoomIn = () => {
    viewRef.current.scale = Math.min(3, viewRef.current.scale * 1.2);
    applyTransform();
    forceUpdate((n) => n + 1);
  };
  const zoomOut = () => {
    viewRef.current.scale = Math.max(0.2, viewRef.current.scale * 0.8);
    applyTransform();
    forceUpdate((n) => n + 1);
  };
  const resetView = () => {
    viewRef.current = { scale: 0.85, tx: 0, ty: 0 };
    applyTransform();
    forceUpdate((n) => n + 1);
  };

  // Render a single member node (altar-style frame)
  function renderMemberNode(member, gPos, idx, count) {
    const offsetX = idx * (NODE_W + H_GAP);
    const left = gPos.x + offsetX;
    const top = gPos.y;

    return (
      <div
        key={member.id}
        className="tree-node"
        style={{ left, top, width: NODE_W, height: NODE_H }}
        onClick={(e) => {
          if (didDrag.current) return; // ignore drag gestures
          e.stopPropagation();
          onSelect && onSelect(member);
        }}
        onMouseEnter={() => setTooltip({
          x: left + NODE_W / 2,
          y: top - 10,
          name: member.tenTu,
          title: member.thuyHieu || '',
          birth: member.ngaySinh || '',
          death: member.ngayMat || '',
        })}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Altar-style frame */}
        <div className="altar-frame">
          <div className="altar-roof">
            <svg viewBox="0 0 80 16" width="80" height="16">
              <path d="M0 16 L10 4 Q40 -2 70 4 L80 16" fill="#8b2a2a" stroke="#d4af37" strokeWidth="1"/>
              <path d="M15 6 Q40 0 65 6" stroke="#d4af37" strokeWidth="0.8" fill="none"/>
            </svg>
          </div>
          <div className="altar-body">
            <div className="altar-photo-border">
              <img
                src={proxyImageUrl(member.hinhAnh)}
                alt={member.tenTu}
                className="altar-photo"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="altar-photo-fallback" style={{ display: 'none' }}>
                <span>{(member.tenTu || '?')[0]}</span>
              </div>
            </div>
          </div>
          <div className="altar-base">
            <svg viewBox="0 0 80 8" width="80" height="8">
              <rect x="0" y="0" width="80" height="8" fill="#8b2a2a" rx="1"/>
              <line x1="5" y1="4" x2="75" y2="4" stroke="#d4af37" strokeWidth="0.6"/>
            </svg>
          </div>
        </div>
        <div className="node-label">
          <span className="node-name-text">{member.tenTu}</span>
        </div>
      </div>
    );
  }

  return (
    <section className="ft-tree">
      {/* Zoom controls */}
      <div className="tree-controls">
        <button className="ctrl-btn" onClick={zoomIn} title="Phóng to">＋</button>
        <button className="ctrl-btn" onClick={zoomOut} title="Thu nhỏ">−</button>
        <button className="ctrl-btn" onClick={resetView} title="Đặt lại">⟲</button>
      </div>

      <div className="tree-viewport" ref={containerRef}>
        <div
          className="tree-canvas"
          ref={canvasRef}
          style={{
            width: canvasSize.w,
            height: canvasSize.h,
            transform: `translate(${viewRef.current.tx}px, ${viewRef.current.ty}px) scale(${viewRef.current.scale})`,
          }}
        >
          {/* SVG connectors */}
          <svg className="tree-svg" width={canvasSize.w} height={canvasSize.h}>
            <defs>
              {/* Heart shape definition */}
              <symbol id="heart" viewBox="0 0 24 24">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                     2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                     C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                     c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="#e74c6f"
                  stroke="#c0392b"
                  strokeWidth="0.5"
                />
              </symbol>
            </defs>
            {connectors.paths.map((c) => (
              <path
                key={c.key}
                d={c.d}
                className={c.type === 'spouse' ? 'connector-spouse' : 'connector-child'}
                fill="none"
                strokeLinecap="round"
              />
            ))}
            {/* Heart icons between spouse nodes */}
            {connectors.hearts.map((h) => (
              <use
                key={h.key}
                href="#heart"
                x={h.x - 10}
                y={h.y - 10}
                width="20"
                height="20"
                className="spouse-heart"
              />
            ))}
          </svg>

          {/* Member nodes */}
          {Object.entries(positions).map(([groupId, gPos]) => {
            const mList = groups.get(groupId) || [];
            if (groupId === '__root__' || mList.length === 0) return null;
            return (
              <React.Fragment key={groupId}>
                {mList.map((m, idx) => renderMemberNode(m, gPos, idx, mList.length))}
              </React.Fragment>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <div className="tree-tooltip" style={{ left: tooltip.x - 90, top: tooltip.y - 80 }}>
              <div className="tt-name">{tooltip.name}</div>
              {tooltip.title && <div className="tt-title">{tooltip.title}</div>}
              <div className="tt-meta">
                {tooltip.birth && <span>Sinh: {tooltip.birth}</span>}
                {tooltip.death && <span> • Mất: {tooltip.death}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
