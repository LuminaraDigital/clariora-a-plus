/**
 * Clariora Exam Simulator v3.0.0
 * data.js - Data Provider Layer for Questions, Videos, Notes, and Objectives
 * File: js/data.js
 */

(function(window) {
  'use strict';

  window.APlus = window.APlus || {};
  const APlus = window.APlus;

  const DataLayer = {
    isReady() {
      return Boolean(window.COMPTIA_EXAM_DATA && window.COMPTIA_EXAM_DATA.core1 && window.COMPTIA_EXAM_DATA.core2);
    },

    getRawExamData() {
      return window.COMPTIA_EXAM_DATA || { core1: [], core2: [], version: '3.0.0' };
    },

    getQuestions(examType = 'both') {
      const raw = this.getRawExamData();
      if (examType === 'az900' || examType === 'ms_az900') {
        const azPool = (raw.az900 || (window.AZ900_EXAM_DATA && window.AZ900_EXAM_DATA.az900) || []);
        return azPool.map(q => ({ ...q, exam: 'az900' }));
      }
      if (examType === 'az500' || examType === 'ms_az500' || examType === 'azure_security' || examType === 'azure_sec') {
        const azPool = (raw.az500 || (window.AZ500_EXAM_DATA && window.AZ500_EXAM_DATA.az500) || []);
        return azPool.map(q => ({ ...q, exam: 'az500' }));
      }
      if (examType === 'core1') {
        return (raw.core1 || []).map(q => ({ ...q, exam: 'core1' }));
      }
      if (examType === 'core2') {
        return (raw.core2 || []).map(q => ({ ...q, exam: 'core2' }));
      }
      const c1 = (raw.core1 || []).map(q => ({ ...q, exam: 'core1' }));
      const c2 = (raw.core2 || []).map(q => ({ ...q, exam: 'core2' }));
      return [...c1, ...c2];
    },

    getQuestionById(id) {
      if (!id) return null;
      if (String(id).startsWith('AZ500-') || String(id).startsWith('PBQ-AZ500')) {
        const azPool = this.getQuestions('az500');
        const match = azPool.find(q => q.id === id);
        if (match) return match;
      }
      if (String(id).startsWith('AZ-') || String(id).startsWith('PBQ-AZ-')) {
        const azPool = this.getQuestions('az900');
        const match = azPool.find(q => q.id === id);
        if (match) return match;
      }
      const all = this.getQuestions('both');
      return all.find(q => q.id === id) || null;
    },

    getDomainQuestions(examType, domainPrefixOrName) {
      const pool = this.getQuestions(examType);
      const query = String(domainPrefixOrName).toLowerCase().trim();
      return pool.filter(q => {
        const domain = (q.domain || '').toLowerCase();
        return domain.includes(query) || domain.startsWith(query);
      });
    },

    getVideos(exam = '1201') {
      const key = String(exam);
      if (key === '1202' || key === 'core2') {
        return window.PROFESSOR_MESSER_1202_VIDEOS || [];
      }
      return window.PROFESSOR_MESSER_1201_VIDEOS || [];
    },

    getVideoForObjective(objective, exam = '1201') {
      const videos = this.getVideos(exam);
      const objStr = String(objective).trim();
      return videos.find(v => String(v.objective).trim() === objStr) || null;
    },

    getObjectivesData(examType) {
      const active = (window.APlus && window.APlus.trackRegistry) ? window.APlus.trackRegistry.getActiveTrackId() : 'core1';
      const target = examType || active;
      if (target === 'az500' || target === 'ms_az500' || target === 'azure_security' || target === 'azure_sec') {
        return window.AZ500_OBJECTIVES_DATA || null;
      }
      if (target === 'az900' || target === 'ms_az900') {
        return window.AZ900_OBJECTIVES_DATA || null;
      }
      return window.COMPTIA_OBJECTIVES_DATA || null;
    },

    getStudyLibrary(examType) {
      const active = (window.APlus && window.APlus.trackRegistry) ? window.APlus.trackRegistry.getActiveTrackId() : 'core1';
      const target = examType || active;
      if (target === 'az500' || target === 'ms_az500' || target === 'azure_security' || target === 'azure_sec') {
        return window.AZ500_STUDY_LIBRARY || null;
      }
      if (target === 'az900' || target === 'ms_az900') {
        return window.AZ900_STUDY_LIBRARY || null;
      }
      return window.COMPTIA_STUDY_LIBRARY || null;
    },

    getNotesIndex() {
      return window.APLUS_NOTES_INDEX || [];
    },

    getDomainList(examType = 'core1') {
      if (examType === 'az500' || examType === 'ms_az500' || examType === 'azure_security' || examType === 'azure_sec') {
        return [
          { code: '1.0', name: '1.0 Manage identity and access', weight: 28 },
          { code: '2.0', name: '2.0 Secure networking', weight: 22 },
          { code: '3.0', name: '3.0 Secure compute, storage, and databases', weight: 25 },
          { code: '4.0', name: '4.0 Manage security operations', weight: 25 }
        ];
      }
      if (examType === 'az900' || examType === 'ms_az900') {
        return [
          { code: '1.0', name: '1.0 Describe cloud concepts', weight: 28 },
          { code: '2.0', name: '2.0 Describe Azure architecture and services', weight: 37 },
          { code: '3.0', name: '3.0 Describe Azure management and governance', weight: 35 }
        ];
      }
      if (examType === 'core1') {
        return [
          { code: '1.0', name: '1.0 Mobile Devices', weight: 13 },
          { code: '2.0', name: '2.0 Networking', weight: 23 },
          { code: '3.0', name: '3.0 Hardware', weight: 25 },
          { code: '4.0', name: '4.0 Virtualization and Cloud Computing', weight: 11 },
          { code: '5.0', name: '5.0 Hardware and Network Troubleshooting', weight: 28 }
        ];
      }
      return [
        { code: '1.0', name: '1.0 Operating Systems', weight: 28 },
        { code: '2.0', name: '2.0 Security', weight: 28 },
        { code: '3.0', name: '3.0 Software Troubleshooting', weight: 23 },
        { code: '4.0', name: '4.0 Operational Procedures', weight: 21 }
      ];
    }
  };

  APlus.data = DataLayer;

})(typeof window !== 'undefined' ? window : this);
