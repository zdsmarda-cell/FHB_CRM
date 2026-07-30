import fs from 'fs';

let content = fs.readFileSync('src/components/views/KanbanBoard.tsx', 'utf8');

// 1. Add state for unassigned
const stateTarget = `  const [zoomLevel, setZoomLevel] = useState(() => {`;
const stateReplacement = `  const [showUnassignedOnly, setShowUnassignedOnly] = useState(() => {
    return localStorage.getItem('kanban_unassigned') === 'true';
  });
  
  useEffect(() => {
    localStorage.setItem('kanban_unassigned', showUnassignedOnly.toString());
  }, [showUnassignedOnly]);

  const [zoomLevel, setZoomLevel] = useState(() => {`;
content = content.replace(stateTarget, stateReplacement);

// 2. Add unassigned filtering
const filterTarget = `    if (state.kanbanUserFilter) {`;
const filterReplacement = `    if (showUnassignedOnly) {
      deals = deals.filter(d => !getCurrentAssigneeId(d));
    }
    if (state.kanbanUserFilter) {`;
content = content.replace(filterTarget, filterReplacement);

// 3. Add scroll refs and handlers
const refsTarget = `  const navigate = useNavigate();`;
const refsReplacement = `  const navigate = useNavigate();
  
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);

  useEffect(() => {
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setBoardScrollWidth(scrollContainerRef.current.scrollWidth);
      }
    };
    updateWidth();
    const t = setTimeout(updateWidth, 150);
    return () => clearTimeout(t);
  });

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (scrollContainerRef.current) {
      isSyncingBottom.current = true;
      scrollContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
`;
content = content.replace(refsTarget, refsReplacement);

// 4. Add checkbox to UI
const uiTarget = `          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">-</button>
            <span className="text-xs font-medium w-10 text-center text-gray-700">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">+</button>
          </div>
        </div>`;
const uiReplacement = `          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
            <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">-</button>
            <span className="text-xs font-medium w-10 text-center text-gray-700">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="text-gray-500 hover:text-gray-800 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-50 font-medium">+</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer ml-4">
            <input 
              type="checkbox" 
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            {t('common.unassignedDeals', 'Nepřiřazené příležitosti')}
          </label>
        </div>`;
content = content.replace(uiTarget, uiReplacement);

// 5. Wrap kanban content with top scrollbar
const kanbanTarget = `      ) : (
        <div 
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDragLeave={stopAutoScroll}
          className="overflow-x-auto pb-4 flex-1"
        >
        <div 
          className="flex gap-6 items-start h-full"`;
const kanbanReplacement = `      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div 
            ref={topScrollRef} 
            className="overflow-x-auto overflow-y-hidden shrink-0"
            onScroll={handleTopScroll}
          >
            <div style={{ width: boardScrollWidth, height: 1 }}></div>
          </div>
          <div 
            ref={scrollContainerRef}
            onDragOver={handleContainerDragOver}
            onDragLeave={stopAutoScroll}
            onScroll={handleBottomScroll}
            className="overflow-x-auto pb-4 flex-1 mt-1"
          >
            <div 
              className="flex gap-6 items-start h-full w-max"`;
content = content.replace(kanbanTarget, kanbanReplacement);

// 6. Close the extra flex-col div at the end
const endTarget = `                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {stageDeals.map(deal => (
                  <DealCard 
                    key={deal.id} 
                    deal={deal} 
                    users={users}
                    companies={companies}
                    onClick={() => navigate(\`/deal/\${deal.id}\`)}
                    onAssigneeClick={() => setAssigneeModalDeal(deal)}
                  />
                ))}
              </div>
            </div>
          );
          })}
        </div>
        </div>
      )}`;
const endReplacement = `                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {stageDeals.map(deal => (
                  <DealCard 
                    key={deal.id} 
                    deal={deal} 
                    users={users}
                    companies={companies}
                    onClick={() => navigate(\`/deal/\${deal.id}\`)}
                    onAssigneeClick={() => setAssigneeModalDeal(deal)}
                  />
                ))}
              </div>
            </div>
          );
          })}
            </div>
          </div>
        </div>
      )}`;
content = content.replace(endTarget, endReplacement);

fs.writeFileSync('src/components/views/KanbanBoard.tsx', content);
console.log('done patch');
