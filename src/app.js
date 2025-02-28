import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import watch from './view.js';
import locales from './locales/index.js';
import parse from './rss-parser.js';

//сначала прокси для получения данных с сервера
const getUrlRss = (rssUrl) => {
const proxyUrl = new URL('https://allorigins.hexlet.app/get');
    proxyUrl.searchParams.set('disableCache', true); // не использовать кэш, а добавлять новые данные
    proxyUrl.searchParams.set('url', rssUrl);
    return proxyUrl.toString();
};

export default () => {
const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    feedback: document.querySelector('.feedback'),
    posts: document.querySelector('.posts'),
    feeds: document.querySelector('.feeds'),
    modal: document.querySelector('.modal'),
    submitButton: document.querySelector('form button'),
};

  //изначальное состояние
const initialState = {
    status: 'filling', // загрузка
    form: {
    errors: '',
    },
    loadedFeeds: [],
    contents: {
    feeds: [],
    posts: [],
    },
    ui: {
    seenPosts: [],
    },
    modal: {
    title: "",
    description: "",
    id: "",
    href: "",
    },
};

const i18n = i18next.createInstance();
i18n.init({
    lng: 'ru',
    debug: false,
    resources: locales,
});

const watchedState = watch(elements, i18n, initialState);

  //ищем новости
const newNewsPost = () => {
    if (!watchedState || !watchedState.contents) {
    console.error(
        'Ошибка: watchedState или watchedState.contents не определены!'
    );
    return;
    }
    const titlesOfPosts = watchedState.contents.posts.map(({ title }) => title); //заголовки новостейU
    const arrayOfPromises = watchedState.loadedFeeds.map(([url, idOfFeed]) =>
    axios
        .get(getUrlRss(url))
        .then((response) => {
        const { posts } = parse(response.data);
        const newPosts = posts
            .filter((post) => !titlesOfPosts.includes(post.title))
            .map((item) => {
              //ищем новые посты, добавляем в список
              const feedId = idOfFeed; //уникальные не повторяющиеся новости
            return { ...item, feedId };
            });
        if (watchedState.loadedFeeds.length > 0) {
            watchedState.contents.posts = [
            ...newPosts,
            ...watchedState.contents.posts,
            ];
        }
        })
        .catch((error) => {
        console.log('error: ', error);
        })
    );
    Promise.all(arrayOfPromises).finally(() => {
    setTimeout(() => newNewsPost(), 5000);
    });
};

newNewsPost();

  //локализация yup
yup.setLocale({
    mixed: {
    required: 'errors.required',
    notOneOf: 'errors.rssAlreadyExists',
    },
    string: {
    url: 'errors.invalidForm',
    },
});

elements.form.addEventListener('submit', (event) => {
    event.preventDefault();

    //новый дата объект для доступа к данным формы
    const formData = new FormData(event.target);
    const newRss = Object.fromEntries(formData);

    const schema = yup.object().shape({
    url: yup
        .string()
        .required()
        .url()
        .notOneOf(watchedState.loadedFeeds.map(([url]) => url)), //должна быть строка, не должен быть пустой и не один из повторяющихся юрлов
    });

    schema
      .validate(newRss, { abortEarly: false }) // проверка на нарушение верхних правил
    .then((data) => {
        watchedState.status = 'loading'; // загрузка ленты если все ок

        axios
        .get(getUrlRss(data.url), { timeout: 5000 })
        .then((response) => {
            if (response.status === 200) {
              const { feed, posts } = parse(response.data); // фиды и лента новостей если все окей
            watchedState.contents.feeds.unshift(feed);
            watchedState.contents.posts = [
                ...posts,
                ...watchedState.contents.posts,
            ];
            watchedState.loadedFeeds.push([data.url, feed.id]);
            watchedState.status = 'filling';
            } else {
            throw new Error('errors.notRSS');
            }
        })
        .catch((error) => {
            const { message } = error;
            watchedState.form.errors =
            message === 'timeout of 5000ms exceeded'
                ? 'errors.timeout'
                : message;
            watchedState.status = 'filling';
        });
    })
    .catch((err) => {
        const { message } = err;
        watchedState.form.errors = message;
        watchedState.status = 'filling';
    });
});

elements.posts.addEventListener('click', (event) => {
    // тыкнуть посмотреть новость
    if (event.target.dataset.id) {
    const { id } = event.target.dataset;
    if (
        !watchedState ||
        !watchedState.contents ||
        !watchedState.contents.posts
    ) {
        console.error(
        'Ошибка: watchedState, watchedState.contents или watchedState.contents.posts не определены!'
        );
        return;
    }
    watchedState.contents.posts.forEach((post) => {
        if (post.id === id) {
        watchedState.modal = {
            title: post.title,
            description: post.description,
            href: post.url,
            id: post.id,
        };
        watchedState.ui.seenPosts.push(post.id);
        }
    });
    }
});
};
