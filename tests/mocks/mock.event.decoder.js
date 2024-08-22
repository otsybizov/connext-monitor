
class MockEventDecoder {
	get() {
		return (data) => {
			return data;
		}
	}
}

module.exports = { MockEventDecoder };