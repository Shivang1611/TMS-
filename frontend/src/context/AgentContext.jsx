import React, { createContext, useContext, useState } from 'react';

const AgentContext = createContext();

export function AgentProvider({ children }) {
  const [pageContext, setPageContext] = useState({
    entityType: null,
    entityId: null,
    isFormView: false,
    draftFields: null,
  });

  return (
    <AgentContext.Provider value={{ pageContext, setPageContext }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
}
