import { useState, useEffect } from 'react';

/**
 * Custom hook for resize observer
 * @param {React.MutableRefObject} ref - Reference to the element to observe
 * @returns {DOMRectReadOnly|null} - The content rectangle of the observed element
 */
const useResizeObserver = (ref) => {
    const [dimensions, setDimensions] = useState(null);

    useEffect(() => {
        const observeTarget = ref.current;
        if (!observeTarget) return;

        const resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                setDimensions(entry.contentRect);
            });
        });

        resizeObserver.observe(observeTarget);
        return () => {
            resizeObserver.unobserve(observeTarget);
        };
    }, [ref]);

    return dimensions;
};

export default useResizeObserver;
