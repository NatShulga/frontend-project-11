/* eslint-disable spellcheck/spell-checker */
import * as yup from 'yup';


//сначала прокси для получения данных с сервера
const getUrlRss = (rssUrl) => {
    const url = new URL('/get', 'https://allorigins.hexlet.app');
    url.searchParams.set('disableCache', true);// не использовать кэш, а добавлять новые данные
    url.searchParams.set('url', rssUrl);
    return url.toString();
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
        status: 'filling', // 'loading'
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
        title: '',
        description: '',
        id: '',
        href: '',
        },
    };

    const watchedState = watch(elements, initialState);

    //ищем новости
    const newNewsPost = () => {
        const titlesOfPosts = watchedState.contents.posts.map(({ title }) => title);//заголовки новостей
        const arrayOfPromises = watchedState.loadedFeeds.map(([url, idOfFeed]) => axios.get(getUrlRss(url))
        .then((response) => {
            const { posts } = parse(response.data);
            const newPosts = posts.filter((post) => !titlesOfPosts.includes(post.title)).map((item) => { //ищем новые посты, добавляем в список
            const feedId = idOfFeed; //уникальные не повторяющиеся новости
            return { ...item, feedId };
            });getUrlRss
            if (watchedState.loadedFeeds.length > 0) {
            watchedState.contents.posts = [...newPosts, ...watchedState.contents.posts];
            }
        }).catch((error) => {
            console.log('error: ', error);
        }));
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
    }

};