export class PolyChat {
    async connectAll() {
        await Promise.all(this.adapters.map(adapter => adapter.connect()));
    }
    async disconnectAll() {
        await Promise.all(this.adapters.map(adapter => adapter.disconnect()));
    }
}
