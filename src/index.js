import Consts from './const'
import Utils from './utils'
import Logger from './logger'
import Cleaner from './cleaner'

let badWord = atob(Consts.BAD_WORD);
let niceWord = Consts.NICE_WORD;

const askForBadWord = () => {
	return new Promise((resolve, reject) => {
		badWord = prompt('Enter the word you want to get rid from Internet (leave empty to use custom):') || badWord;
		niceWord = prompt('Enter the word you want the previous word to be replaced with (leave empty to use custom):') || niceWord;
		resolve();
	});
}

const fetchSearchResults = () => {
	return new Promise((resolve, reject) => {
		Logger.Log('Fetching search results...');
		const xmlhttp =  new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				resolve(xmlhttp.responseText);
			}
		}
		// TODO: reject on failure
		xmlhttp.open('GET',
			Consts.GITHUB_SEARCH_PAGE_URL
			.replace('QUERY', badWord)
			.replace('PAGE', Math.floor(Math.random() * 100) + 1), // random page number from 1 to 100
			true);
		xmlhttp.send();
	});
}

const pickRandomFile = (html) => {
	return new Promise((resolve, reject) => {
		Logger.Log('Picking random file...');
		const container = Utils.CreateContainer(html);
		const files = container.querySelectorAll('.code-list-item');
		const fileIndex = Math.floor(Math.random() * files.length) + 1;
		let fileUrl = files[fileIndex].querySelector('a:nth-child(2)').href;
		fileUrl = fileUrl.split('/')
			.map((item, index) => {
				if (index === 6) { return 'master'; } 	// replace blob GUID with master
				return item;
			}).join('/')
		resolve(fileUrl);
	});
}

const fetchFileForm = (url) => {
	return new Promise((resolve, reject) => {
		Logger.Log('Fetching file form...');
		const xmlhttp =  new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				const container = Utils.CreateContainer(xmlhttp.responseText);
				const auth_token_input = container.querySelector('.octicon-pencil').parentElement.parentElement.querySelectorAll('input')[1];

				resolve({
					url,
					token: auth_token_input.value
				});
			}
		}
		// TODO: reject on failure
		xmlhttp.open('GET', url);
		xmlhttp.send();
	});
}

const fetchEditForm = (data) => {
	return new Promise((resolve, reject) => {
		const url = data.url.replace('/blob/', '/edit/');
		Logger.Log('Fetching edit form...');
		const xmlhttp =  new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				resolve({
					url: data.url,
					html: xmlhttp.responseText
				});
			}
		}
		// TODO: reject on failure
		xmlhttp.open('POST', url);
		var formData = new FormData();
		formData.append('utf8', '✓');
		formData.append('authenticity_token', data.token);
		xmlhttp.send(formData);
	});
}

const sendNicerInternet = (data) => {
	return new Promise((resolve, reject) => {
		const url = data.url.replace('/blob/master/', '/tree-save/master/');
		Logger.Log('Sending propose change data...');
		// extract all necessary data first
		const container = Utils.CreateContainer(data.html);

		const xmlhttp =  new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				resolve(xmlhttp.responseURL);
			}
		}
		// TODO: reject on failure
		xmlhttp.open('POST', url);
		var formData = new FormData();
		formData.append('utf8', '✓');
		formData.append('authenticity_token', (container.querySelector('.js-blob-form>input[name=authenticity_token]').value));
		formData.append('filename', (container.querySelector('input[name=filename]').value));
		formData.append('new_filename', (container.querySelector('input[name=new_filename]').value));
		formData.append('commit', (container.querySelector('.js-commit-oid').value));
		formData.append('quick_pull', (container.querySelector('input[name=quick_pull]').value));
		formData.append('pr', '');
		formData.append('content_changed', 'true');
		formData.append('value', Cleaner.Clean(container.querySelector('.js-code-textarea').value, badWord, niceWord));
		formData.append('message', '');
		formData.append('placeholder_message', ('Internet cleaning'));
		formData.append('description', ('Powered by [Internet Cleaner®️](https://github.com/404-html/internet-cleaner)'));
		setTimeout(() => {
			xmlhttp.send(formData);
		}, 2000);
	});
}

const fetchProposeChangeForm = (url) => {
	Logger.Log('Fetching propose change form...');
	return new Promise((resolve, reject) => {
		const xmlhttp =  new XMLHttpRequest();
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				resolve(xmlhttp.responseText);
			}
		}
		// TODO: reject on failure
		xmlhttp.open('GET',
			url,
			true);
		xmlhttp.send();
	});
};

askForBadWord()
	.then(fetchSearchResults)
	.then(pickRandomFile)
	.then(fetchFileForm)
	.then(fetchEditForm)
	.then(sendNicerInternet)
	.then(fetchProposeChangeForm)
	.then((html) => {
			document.open("text/html", "replace");
			document.write(html);
			document.close();
			// TODO: wait for document to be loaded instead of using timeout
			setTimeout(() => {
				document.querySelector('.compare-pr-placeholder>button').click();
			}, 700);

			Logger.Log('I\'m done!');
		})
		.catch((ex) => {
			Logger.Log('Something went wrong! Bad side of Internet is defending itself...');
			Logger.Log(ex);
		});
