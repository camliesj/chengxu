import React, { useState } from 'react';

export default function LegacyCloudImportDialog({ insuranceCount, customerCount, onImport, onSkip }) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const total = insuranceCount + customerCount;

  async function importRecords() {
    setIsImporting(true);
    setError('');
    try {
      await onImport();
    } catch (importError) {
      setError(importError.message || '历史档案导入失败，请稍后重试');
      setIsImporting(false);
    }
  }

  return (
    <div className="legacy-import-backdrop" role="presentation">
      <section className="legacy-import-dialog" role="dialog" aria-modal="true" aria-labelledby="legacy-import-title">
        <header>
          <span>本机历史数据</span>
          <h2 id="legacy-import-title">发现可迁移到云端的档案</h2>
          <p>这些记录已安全备份。导入只会补充云端缺少的档案，不会覆盖同编号的云端数据。</p>
        </header>
        <div className="legacy-import-counts">
          <div><strong>{insuranceCount}</strong><span>条保险档案</span></div>
          <div><strong>{customerCount}</strong><span>条客户车辆</span></div>
          <div><strong>{total}</strong><span>条待迁移</span></div>
        </div>
        {error ? <p className="legacy-import-error">{error}</p> : null}
        <footer>
          <button type="button" onClick={onSkip} disabled={isImporting}>暂不导入</button>
          <button type="button" className="legacy-import-primary" onClick={importRecords} disabled={isImporting}>
            {isImporting ? '正在导入...' : '导入云端'}
          </button>
        </footer>
      </section>
    </div>
  );
}
