const grpc = require('grpc');

const zipkinBaseUrl = 'http://faked:64800';

const CLSContext = require('zipkin-context-cls');

const {Tracer, BatchRecorder, option: {Some, None}} = require('zipkin');
const {HttpLogger} = require('zipkin-transport-http');

const recorder = new BatchRecorder({
  logger: new HttpLogger({
    endpoint: `${zipkinBaseUrl}/api/v1/spans`
  })
});

const ctxImpl = new CLSContext('zipkin');

const tracer = new Tracer({ctxImpl, recorder});

const ZipkinGrpcInterceptor = require('../src/ZipkinGrpcInterceptor');

const ZIPKIN_GRPC_INTCP = new ZipkinGrpcInterceptor(tracer);

const chai = require('chai');
const {expect} = chai;

describe('Zipkin GRPC interceptor basic test', () => {
  it("No 'grpc.Metadata' passed in, should return a 'grpc.Metadata' instance with " +
        'necessary X-B3 fields.', (done) => {
    const metadata = ZIPKIN_GRPC_INTCP.beforeClientDoGrpcCall({});

    expect(metadata).to.be.an.instanceof(grpc.Metadata);

    expect(metadata.get('x-b3-traceid')).to.be.a('Array');
    expect(metadata.get('x-b3-parentspanid')).to.be.a('Array');
    expect(metadata.get('x-b3-spanid')).to.be.a('Array');
    expect(metadata.get('x-b3-sampled')).to.be.a('Array');

    done();
  });

  it("Pass in 'grpc.Metadata', should return previous values with " +
        'necessary X-B3 fields.', (done) => {
    const metadata = new grpc.Metadata();

    metadata.add('deliberateKey', 'deliberateVal');

    const newMetadata = ZIPKIN_GRPC_INTCP.beforeClientDoGrpcCall({grpcMetadata: metadata});

    expect(newMetadata).to.be.an.instanceof(grpc.Metadata);

    expect(newMetadata.get('deliberatekey')[0]).to.equal('deliberateVal');

    done();
  });

  it("Pass in 'grpc.Metadata' with no sampled value, should set sampled to None", (done) => {
    const metadata = new grpc.Metadata();
    metadata.add('x-b3-traceid', '1AAA');
    metadata.add('x-b3-parentspanid', '1BBB');
    metadata.add('x-b3-spanid', '1CCC');

    ZIPKIN_GRPC_INTCP.uponServerRecvGrpcCall({ serviceName: 'test-service1', grpcMetadataFromIncomingCtx: metadata});
    expect(ZIPKIN_GRPC_INTCP.traceId.traceId).to.equal('1AAA');
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled).to.equal(None);

    done();
  });

  it("Pass in 'grpc.Metadata' with sampled '0', should set sampled to Some(false)", (done) => {
    const metadata = new grpc.Metadata();
    metadata.add('x-b3-traceid', '2AAA');
    metadata.add('x-b3-parentspanid', '2BBB');
    metadata.add('x-b3-spanid', '2CCC');
    metadata.add('x-b3-sampled', '0');

    ZIPKIN_GRPC_INTCP.uponServerRecvGrpcCall({ serviceName: 'test-service2', grpcMetadataFromIncomingCtx: metadata});
    expect(ZIPKIN_GRPC_INTCP.traceId.traceId).to.equal('2AAA');
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled).to.be.instanceOf(Some);
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled.value).to.equal(false);

    done();
  });

  it("Pass in 'grpc.Metadata' with sampled '1', should set sampled to Some(true)", (done) => {
    const metadata = new grpc.Metadata();
    metadata.add('x-b3-traceid', '3AAA');
    metadata.add('x-b3-parentspanid', '3BBB');
    metadata.add('x-b3-spanid', '3CCC');
    metadata.add('x-b3-sampled', '1');

    ZIPKIN_GRPC_INTCP.uponServerRecvGrpcCall({ serviceName: 'test-service3', grpcMetadataFromIncomingCtx: metadata});
    expect(ZIPKIN_GRPC_INTCP.traceId.traceId).to.equal('3AAA');
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled).to.be.instanceOf(Some);
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled.value).to.equal(true);

    done();
  });

  it("Pass in 'grpc.Metadata' with sampled 'false', should set sampled to Some(false)", (done) => {
    const metadata = new grpc.Metadata();
    metadata.add('x-b3-traceid', '4AAA');
    metadata.add('x-b3-parentspanid', '4BBB');
    metadata.add('x-b3-spanid', '4CCC');
    metadata.add('x-b3-sampled', 'false');

    ZIPKIN_GRPC_INTCP.uponServerRecvGrpcCall({ serviceName: 'test-service4', grpcMetadataFromIncomingCtx: metadata});
    expect(ZIPKIN_GRPC_INTCP.traceId.traceId).to.equal('4AAA');
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled).to.be.instanceOf(Some);
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled.value).to.equal(false);

    done();
  });

  it("Pass in 'grpc.Metadata' with sampled 'true', should set sampled to Some(true)", (done) => {
    const metadata = new grpc.Metadata();
    metadata.add('x-b3-traceid', '5AAA');
    metadata.add('x-b3-parentspanid', '5BBB');
    metadata.add('x-b3-spanid', '5CCC');
    metadata.add('x-b3-sampled', 'true');

    ZIPKIN_GRPC_INTCP.uponServerRecvGrpcCall({ serviceName: 'test-service5', grpcMetadataFromIncomingCtx: metadata});
    expect(ZIPKIN_GRPC_INTCP.traceId.traceId).to.equal('5AAA');
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled).to.be.instanceOf(Some);
    expect(ZIPKIN_GRPC_INTCP.traceId.sampled.value).to.equal(true);

    done();
  });
});
