import { expect } from 'chai';
import { MediaStreamComposer } from '../src/index';
import { Position } from '../src/stream-position';

describe('Instanciation', () => {
    it('throws if required param is missing', () => {
        // TODO
    });
});

describe('Dimensions calculation', () => {
    const merger = new MediaStreamComposer({}) as any;

    it('calculate "cover" dimentions properly', () => {
        expect(Position.cover.calculatePositionAndDimensions(
            { width: 200, height: 300 },
            { width: 100, height: 200 },
            "none"
        )).to.eql({ displayResolution: {width: 200, height: 400}, position: {x: 0, y: -50}, radius: 100});

        expect(Position.cover.calculatePositionAndDimensions(
            { width: 200, height: 300 },
            { width: 200, height: 300 },
            "none"
        )).to.eql({ displayResolution: {width: 200, height: 300}, position: {x: 0, y: 0 }, radius: 100});

        expect(Position.cover.calculatePositionAndDimensions(
            { width: 600, height: 600 },
            { width: 400, height: 300 },
            "none"
        )).to.eql({ displayResolution: {width: 800, height: 600}, position: {x: -100, y: 0 }, radius: 400});
    });

    it('calculate "contain" dimentions properly', () => {
        expect(Position.contain.calculatePositionAndDimensions(
            { width: 300, height: 400 },
            { width: 100, height: 200 },
            "none"
        )).to.eql({ displayResolution: {width: 200, height: 400}, position: {x: 50, y: 0 }, radius: 100});

        expect(Position.contain.calculatePositionAndDimensions(
            { width: 200, height: 300 },
            { width: 200, height: 300 },
            "none"
        )).to.eql({ displayResolution: {width: 200, height: 300}, position: {x: 0, y: 0 }, radius: 100});

        expect(Position.contain.calculatePositionAndDimensions(
            { width: 600, height: 600 },
            { width: 400, height: 300 },
            "none"
        )).to.eql({ displayResolution: {width: 600, height: 450}, position: {x: 0, y: 75 }, radius: 300});
    });
});